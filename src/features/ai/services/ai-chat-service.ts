import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useAIChatStore } from "@/features/ai/stores/ai-chat.store";
import type { ChatMode, OutputStyle } from "@/features/ai/types/ai-chat.types";
import type { AcpEvent } from "@/features/ai/types/acp.types";
import type { ContextInfo } from "@/features/ai/types/ai-context.types";
import type { AgentType } from "@/features/ai/types/ai-chat.types";
import type { AIMessage } from "@/features/ai/types/messages.types";
import type {
  ProviderAssistantToolMessage,
  ProviderChatMessage,
  ProviderToolCall,
  ProviderToolResultMessage,
} from "@/features/ai/services/providers/ai-provider-interface";
import {
  getAvailableProviders,
  getModelById,
  getProviderById,
} from "@/features/ai/types/providers.types";
import {
  buildProviderSystemPromptContext,
  getProvider,
  shouldUseTauriFetchForProvider,
} from "@/features/ai/services/providers/ai-provider-registry";
import { isOllamaCloudUrl } from "@/features/ai/services/providers/ollama-provider";
import { processStreamingResponse, processStreamingResponseWithToolCalls } from "@/utils/stream-utils";
import { getProviderApiToken } from "@/features/ai/services/ai-token-service";
import { resolveChatCompletionTokenLimit } from "@/features/ai/lib/chat-completion-budget";
import {
  getCustomProviderApiToken,
  resolveCustomProviderBaseUrl,
  resolveCustomProviderModelId,
} from "@/features/ai/lib/custom-provider-config";
import { useSettingsStore } from "@/features/settings/stores/settings.store";
import { AcpStreamHandler } from "./acp-stream-handler";
import { buildContextPrompt, buildSystemPrompt } from "../utils/ai-context-builder";
import { isTerminalAgent } from "../lib/terminal-agents";
import { setCustomProviderBaseUrl } from "./providers/ai-provider-registry";
import { CODEX_INTEGRATION_ID } from "../integrations/integration-registry";
import { CodexIntegrationService } from "../integrations/codex/codex-integration-service";
import {
  BYOK_TOOL_DEFINITIONS,
  BYOK_TOOL_MAX_ROUNDS,
  executeByokTool,
  getByokToolDescription,
  previewByokTool,
  isByokToolName,
  parseByokToolArguments,
  type ByokToolPermissionDecision,
  type ByokToolPermissionRequest,
} from "../lib/byok-tools";

// Check if an agent uses ACP (CLI-based) vs HTTP API
export const isAcpAgent = (agentId: AgentType): boolean => {
  return agentId !== "custom" && agentId !== CODEX_INTEGRATION_ID && !isTerminalAgent(agentId);
};

function getByokToolKind(
  toolName: string,
): Extract<AcpEvent, { type: "tool_start" }>["kind"] {
  if (toolName === "read_file" || toolName === "list_files") return "read";
  if (toolName === "create_file" || toolName === "write_file" || toolName === "apply_patch") {
    return "edit";
  }
  if (toolName === "run_terminal_command") return "execute";
  return "other";
}

function serializeByokToolResult(output: unknown, error?: string): string {
  const value = error ? { error } : output;
  const serialized = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return serialized.length > 120_000
    ? `${serialized.slice(0, 120_000)}\\n[tool output truncated]`
    : serialized;
}

function redactProviderError(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/nvapi-[A-Za-z0-9_-]+/g, "nvapi-[redacted]")
    .trim()
    .slice(0, 320);
}

function formatProviderHttpError(
  providerId: string,
  providerName: string,
  status: number,
  statusText: string,
  body: string,
): string {
  const safeBody = redactProviderError(body);
  if (status === 401 || status === 403) {
    return `${providerName} rejected the API key. Verify the key in Settings -> Agent Mode -> Manage keys.`;
  }
  if (status === 404 && providerId === "custom") {
    return "Custom endpoint was not found. Use the provider base URL, for example https://host/v1, not /models or /chat/completions.";
  }
  if (status === 404 && providerId === "nvidia") {
    return "NVIDIA NIM endpoint or model was not found. Refresh the NVIDIA model list and select an available model.";
  }
  if ((status === 400 || status === 422) && providerId === "custom") {
    return `Custom provider rejected the request. Verify the model ID and OpenAI-compatible endpoint. ${safeBody}`.trim();
  }
  if ((status === 400 || status === 422) && providerId === "nvidia") {
    return `NVIDIA NIM rejected the request. Verify the selected model and token limit. ${safeBody}`.trim();
  }
  const details = safeBody || statusText || "Request failed";
  return `${providerName} API error (${status}): ${details}`;
}

function resolveProviderModelPair(providerId: string, modelId: string) {
  const requestedProvider = getProviderById(providerId);
  const { dynamicModels } = useAIChatStore.getState();
  const requestedStaticModel = getModelById(providerId, modelId);
  const fetchedModels = dynamicModels[providerId] || [];
  const hasFreshNvidiaCatalog = providerId === "nvidia" && fetchedModels.length > 0;
  if (
    requestedProvider &&
    requestedStaticModel &&
    (!hasFreshNvidiaCatalog || fetchedModels.some((model) => model.id === modelId))
  ) {
    return {
      providerId,
      modelId,
      provider: requestedProvider,
      model: requestedStaticModel,
    };
  }

  const requestedDynamicModel = dynamicModels[providerId]?.find((model) => model.id === modelId);
  if (requestedProvider && requestedDynamicModel) {
    return {
      providerId,
      modelId,
      provider: requestedProvider,
      model: {
        ...requestedDynamicModel,
        maxTokens: requestedDynamicModel.maxTokens || 4096,
      },
    };
  }

  if (requestedProvider?.id === "openrouter" && modelId.trim().length > 0) {
    return {
      providerId,
      modelId,
      provider: requestedProvider,
      model: {
        id: modelId,
        name: modelId,
        maxTokens: 4096,
      },
    };
  }

  if (requestedProvider?.id === "custom") {
    const customModelId = resolveCustomProviderModelId(
      useSettingsStore.getState().settings,
      modelId,
    );
    if (customModelId.trim().length > 0) {
      return {
        providerId,
        modelId: customModelId,
        provider: requestedProvider,
        model: {
          id: customModelId,
          name: customModelId,
          maxTokens: 4096,
        },
      };
    }
  }

  for (const provider of getAvailableProviders()) {
    const staticModel = provider.models.find((model) => model.id === modelId);
    const providerFetchedModels = dynamicModels[provider.id] || [];
    const providerHasFreshNvidiaCatalog = provider.id === "nvidia" && providerFetchedModels.length > 0;
    if (staticModel && (!providerHasFreshNvidiaCatalog || providerFetchedModels.some((model) => model.id === modelId))) {
      return {
        providerId: provider.id,
        modelId,
        provider,
        model: staticModel,
      };
    }

    const dynamicModel = dynamicModels[provider.id]?.find((model) => model.id === modelId);
    if (dynamicModel) {
      return {
        providerId: provider.id,
        modelId,
        provider,
        model: {
          ...dynamicModel,
          maxTokens: dynamicModel.maxTokens || 4096,
        },
      };
    }
  }

  return {
    providerId,
    modelId,
    provider: requestedProvider,
    model: undefined,
  };
}

// Generic streaming chat completion function that works with any agent/provider
export const getChatCompletionStream = async (
  agentId: AgentType,
  providerId: string,
  modelId: string,
  userMessage: string,
  context: ContextInfo,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: string, canReconnect?: boolean) => void,
  conversationHistory?: AIMessage[],
  onNewMessage?: () => void,
  onToolUse?: (event: Extract<AcpEvent, { type: "tool_start" }>) => void,
  onToolUpdate?: (event: Extract<AcpEvent, { type: "tool_update" }>) => void,
  onToolComplete?: (toolName: string, toolId?: string, output?: unknown, error?: string) => void,
  onPermissionRequest?: (event: Extract<AcpEvent, { type: "permission_request" }>) => void,
  onAcpEvent?: (event: AcpEvent) => void,
  mode: ChatMode = "chat",
  outputStyle: OutputStyle = "default",
  onImageChunk?: (data: string, mediaType: string) => void,
  onResourceChunk?: (uri: string, name: string | null) => void,
  chatId?: string,
  systemPromptOverride?: string,
  onByokToolPermission?: (
    request: ByokToolPermissionRequest,
  ) => Promise<boolean | ByokToolPermissionDecision>,
): Promise<void> => {
  try {
    if (agentId === CODEX_INTEGRATION_ID) {
      const integration = new CodexIntegrationService(
        {
          onChunk,
          onComplete,
          onError,
          onToolUse,
          onToolComplete,
          onPermissionRequest,
          onEvent: onAcpEvent,
        },
        chatId,
      );
      const contextPrompt = buildContextPrompt(context);
      await integration.start(
        contextPrompt ? `${contextPrompt}\n\nUser request:\n${userMessage}` : userMessage,
        context,
      );
      return;
    }

    // Handle ACP-based CLI agents (Gemini CLI, Codex CLI, etc.)
    if (isAcpAgent(agentId)) {
      const handler = new AcpStreamHandler(
        agentId,
        {
          onChunk,
          onComplete,
          onError,
          onNewMessage,
          onToolUse,
          onToolUpdate,
          onToolComplete,
          onPermissionRequest,
          onEvent: onAcpEvent,
          onImageChunk,
          onResourceChunk,
        },
        chatId,
      );
      await handler.start(userMessage, context);
      return;
    }

    // For "custom" agent, use HTTP API providers. Resolve stale provider/model
    // pairs defensively so a recent selector change cannot call the wrong API.
    const resolved = resolveProviderModelPair(providerId, modelId);
    providerId = resolved.providerId;
    modelId = resolved.modelId;
    const provider = resolved.provider;
    const model = resolved.model;

    if (!provider) {
      throw new Error(
        `Provider "${providerId}" is unavailable. Open Settings -> Agent Mode and select a provider.`,
      );
    }

    if (!model) {
      throw new Error(
        providerId === "custom"
          ? "Custom provider model is required. Add one in Settings -> Agent Mode."
          : `No model is selected for ${provider.name}. Open Settings -> Agent Mode, save your API key, and select or refresh a model.`,
      );
    }

    const settings = useSettingsStore.getState().settings;
    const customProviderBaseUrl =
      providerId === "custom" ? resolveCustomProviderBaseUrl(settings) : "";
    const apiKey =
      providerId === "custom"
        ? await getCustomProviderApiToken()
        : await getProviderApiToken(providerId);
    if (!apiKey && provider.requiresApiKey) {
      throw new Error(`${provider.name} API key not found. Add it in Settings -> Agent Mode -> Manage keys.`);
    }

    if (providerId === "custom" && !customProviderBaseUrl) {
      throw new Error("Custom provider base URL is required. Add one in Settings -> Agent.");
    }
    if (providerId === "custom") {
      setCustomProviderBaseUrl(customProviderBaseUrl);
    }

    // Ollama Cloud requires auth even though the provider config marks the
    // key as optional (since local Ollama doesn't need one).
    if (providerId === "ollama" && !apiKey) {
      const ollamaBaseUrl = useSettingsStore.getState().settings.ollamaBaseUrl;
      if (ollamaBaseUrl && isOllamaCloudUrl(ollamaBaseUrl)) {
        throw new Error(
          "Ollama Cloud requires an API key. Add one in Settings -> Agent Mode -> Ollama.",
        );
      }
    }

    const contextPrompt = buildContextPrompt(context);
    let systemPrompt = systemPromptOverride || buildSystemPrompt(contextPrompt, mode, outputStyle);
    const providerSystemPromptContext = buildProviderSystemPromptContext(providerId, settings);
    if (providerSystemPromptContext) {
      systemPrompt = `${systemPrompt}\n\n${providerSystemPromptContext}`;
    }

    // Build messages array with conversation history
    const messages: ProviderChatMessage[] = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add the current user message
    messages.push({
      role: "user" as const,
      content: userMessage,
    });

    // Use provider abstraction
    const providerImpl = getProvider(providerId);
    if (!providerImpl) {
      throw new Error(`Provider implementation not found: ${providerId}`);
    }

    const canUseByokTools =
      Boolean(context.projectRoot?.trim()) && (providerId === "nvidia" || providerId === "custom");
    const tools = canUseByokTools ? BYOK_TOOL_DEFINITIONS : undefined;
    const headers = providerImpl.buildHeaders(apiKey || undefined);

    // A model may request several tool rounds. Keep this bounded so a malformed
    // or over-eager model cannot keep the desktop process busy indefinitely.
    for (let round = 0; round < (tools ? BYOK_TOOL_MAX_ROUNDS : 1); round += 1) {
      const streamRequest = {
        modelId,
        messages,
        maxTokens: resolveChatCompletionTokenLimit(model.maxTokens),
        temperature: 0.7,
        apiKey: apiKey || undefined,
        tools,
        toolChoice: tools ? ("auto" as const) : undefined,
      };
      const payload = providerImpl.buildPayload(streamRequest);
      const url = providerImpl.buildUrl ? providerImpl.buildUrl(streamRequest) : provider.apiUrl;

      console.log(
        `Making ${provider.name} streaming chat request with model ${model.name}${tools ? ` (tool round ${round + 1})` : ""}...`,
      );

      // Use Tauri's fetch for providers that don't support browser CORS.
      const needsTauriFetch = shouldUseTauriFetchForProvider(providerId);
      const fetchFn = needsTauriFetch ? tauriFetch : fetch;
      const response = await fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${provider.name} API error:`, response.status, response.statusText);
        console.error("Error details:", redactProviderError(errorText));
        onError(
          formatProviderHttpError(
            providerId,
            provider.name,
            response.status,
            response.statusText,
            errorText,
          ),
        );
        return;
      }

      if (!tools) {
        await processStreamingResponse(response, onChunk, onComplete, onError);
        return;
      }

      const toolCalls = await new Promise<ProviderToolCall[]>((resolve, reject) => {
        let settled = false;
        const settle = (value: ProviderToolCall[]) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        void processStreamingResponseWithToolCalls(
          response,
          onChunk,
          (calls) => settle(calls),
          () => settle([]),
          (error) => {
            if (settled) return;
            settled = true;
            reject(new Error(error));
          },
        ).catch(reject);
      });

      if (toolCalls.length === 0) {
        onComplete();
        return;
      }

      const assistantToolMessage: ProviderAssistantToolMessage = {
        role: "assistant",
        content: null,
        tool_calls: toolCalls,
      };
      messages.push(assistantToolMessage);

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let input: Record<string, unknown> = {};
        let toolError: string | undefined;
        try {
          input = parseByokToolArguments(toolCall.function.arguments);
        } catch (error) {
          toolError = error instanceof Error ? error.message : "Invalid tool arguments";
        }

        const toolKind = getByokToolKind(toolName);
        const locations = typeof input.path === "string" ? [{ path: input.path }] : [];
                const validatedToolName = isByokToolName(toolName) ? toolName : null;
        let preview: Awaited<ReturnType<typeof previewByokTool>>["preview"];
        if (!toolError && validatedToolName && ["create_file", "write_file", "apply_patch", "run_terminal_command"].includes(validatedToolName)) {
          const previewResult = await previewByokTool(toolCall, context);
          preview = previewResult.preview;
          toolError = previewResult.error;
        }

        const previewForEvent =
          preview?.kind === "file" || preview?.kind === "command"
            ? {
                kind: preview.kind,
                path: preview.path,
                oldText: preview.oldText,
                newText: preview.newText,
                command: preview.command,
              }
            : undefined;
        onToolUse?.({
          type: "tool_start",
          sessionId: chatId ?? "byok",
          toolName,
          toolId: toolCall.id,
          input,
          kind: toolKind,
          status: "in_progress",
          locations,
          provider: "byok",
          permissionStatus: toolError ? "denied" : "pending",
          preview: previewForEvent,
        });


        if (!toolError && !validatedToolName) {
          toolError = `Unsupported BYOK tool: ${toolName}`;
        }

        if (!toolError && validatedToolName) {
          const permissionDetails = getByokToolDescription(validatedToolName, input);
          const permissionRequest: ByokToolPermissionRequest = {
            requestId: `byok-${chatId ?? "chat"}-${round}-${toolCall.id}`,
            toolId: toolCall.id,
            toolName: validatedToolName,
            description: permissionDetails.description,
            resource: permissionDetails.resource,
            input,
          };
          const approval = onByokToolPermission
            ? await onByokToolPermission(permissionRequest)
            : { approved: false, remember: false };
          const approved = typeof approval === "boolean" ? approval : approval.approved;
          onToolUpdate?.({
            type: "tool_update",
            sessionId: chatId ?? "byok",
            toolId: toolCall.id,
            toolName,
            input,
            kind: toolKind,
            status: approved ? "in_progress" : "failed",
            locations,
            provider: "byok",
            permissionStatus: approved ? "approved" : "denied",
            preview: previewForEvent ?? null,
          });
          if (!approved) {
            toolError = "User denied this BYOK tool request.";
          } else {
            const result = await executeByokTool(toolCall, context);
            toolError = result.error;
            onToolComplete?.(toolName, toolCall.id, result.output, result.error);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: serializeByokToolResult(result.output, result.error),
            } satisfies ProviderToolResultMessage);
            continue;
          }
        }

        onToolComplete?.(toolName, toolCall.id, undefined, toolError);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: serializeByokToolResult(undefined, toolError),
        } satisfies ProviderToolResultMessage);
      }
    }

    onError("The model exceeded the maximum number of BYOK tool rounds.");
  } catch (error: any) {
    console.error(`${providerId} streaming chat completion error:`, error);
    onError(`Failed to connect to ${providerId} API: ${error.message || error}`);
  }
};
