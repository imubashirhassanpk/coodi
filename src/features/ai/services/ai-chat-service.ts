import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useAIChatStore } from "@/features/ai/stores/ai-chat.store";
import type { ChatMode, OutputStyle } from "@/features/ai/types/ai-chat.types";
import type { AcpEvent } from "@/features/ai/types/acp.types";
import type { ContextInfo } from "@/features/ai/types/ai-context.types";
import type { AgentType } from "@/features/ai/types/ai-chat.types";
import type { AIMessage } from "@/features/ai/types/messages.types";
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
import { processStreamingResponse } from "@/utils/stream-utils";
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

// Check if an agent uses ACP (CLI-based) vs HTTP API
export const isAcpAgent = (agentId: AgentType): boolean => {
  return agentId !== "custom" && agentId !== CODEX_INTEGRATION_ID && !isTerminalAgent(agentId);
};

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
  const requestedStaticModel = getModelById(providerId, modelId);
  if (requestedProvider && requestedStaticModel) {
    return {
      providerId,
      modelId,
      provider: requestedProvider,
      model: requestedStaticModel,
    };
  }

  const { dynamicModels } = useAIChatStore.getState();
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
    if (staticModel) {
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
    const messages: AIMessage[] = [
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

    const streamRequest = {
      modelId,
      messages,
      maxTokens: resolveChatCompletionTokenLimit(model.maxTokens),
      temperature: 0.7,
      apiKey: apiKey || undefined,
    };

    const headers = providerImpl.buildHeaders(apiKey || undefined);
    const payload = providerImpl.buildPayload(streamRequest);
    const url = providerImpl.buildUrl ? providerImpl.buildUrl(streamRequest) : provider.apiUrl;

    console.log(`Making ${provider.name} streaming chat request with model ${model.name}...`);

    // Use Tauri's fetch for providers that don't support browser CORS
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

    await processStreamingResponse(response, onChunk, onComplete, onError);
  } catch (error: any) {
    console.error(`${providerId} streaming chat completion error:`, error);
    onError(`Failed to connect to ${providerId} API: ${error.message || error}`);
  }
};
