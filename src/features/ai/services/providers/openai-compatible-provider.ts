import { providerFetch } from "./provider-fetch";
import {
  getOpenAICompatibleChatCompletionsUrl,
  getOpenAICompatibleModelsUrl,
  normalizeOpenAICompatibleBaseUrl,
} from "@/features/ai/lib/openai-compatible-endpoint";
import {
  AIProvider,
  type ProviderHeaders,
  type ProviderModel,
  type StreamRequest,
} from "./ai-provider-interface";

async function getProviderErrorMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  if (!body.trim()) return `${response.status} ${response.statusText}`.trim();

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const error = parsed.error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Keep the plain response body when the server does not return JSON.
  }

  return body.trim().slice(0, 240);
}

export class OpenAICompatibleProvider extends AIProvider {
  private baseUrlOverride = "";

  setBaseUrl(baseUrl: string): void {
    this.baseUrlOverride = normalizeOpenAICompatibleBaseUrl(baseUrl);
  }

  getBaseUrl(): string {
    return this.baseUrlOverride || this.config.apiUrl;
  }

  buildHeaders(apiKey?: string): ProviderHeaders {
    return {
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
      ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
    };
  }

  buildPayload(request: StreamRequest): any {
    return {
      model: request.modelId,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
      ...(request.responseFormat ? { response_format: { type: request.responseFormat } } : {}),
    };
  }

  buildUrl(): string {
    return getOpenAICompatibleChatCompletionsUrl(this.getBaseUrl());
  }

  async getModels(apiKey?: string): Promise<ProviderModel[]> {
    const response = await providerFetch(getOpenAICompatibleModelsUrl(this.getBaseUrl()), {
      method: "GET",
      headers: this.buildHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Model discovery failed: ${await getProviderErrorMessage(response)}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id?: string; name?: string; max_context_length?: number }>;
      models?: Array<{ id?: string; name?: string; max_context_length?: number }>;
    };
    const models = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.models)
        ? data.models
        : [];

    const parsedModels = new Map<string, ProviderModel>();
    for (const model of models) {
      const id = model.id?.trim() || "";
      if (!id || parsedModels.has(id)) continue;

      const parsedModel: ProviderModel = {
        id,
        name: model.name?.trim() || id,
      };
      if (typeof model.max_context_length === "number") {
        parsedModel.maxTokens = model.max_context_length;
      }
      parsedModels.set(id, parsedModel);
    }
    return Array.from(parsedModels.values());
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey.trim()) return false;

    try {
      const response = await providerFetch(getOpenAICompatibleModelsUrl(this.getBaseUrl()), {
        method: "GET",
        headers: this.buildHeaders(apiKey),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
