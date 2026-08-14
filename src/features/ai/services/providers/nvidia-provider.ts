import {
  AIProvider,
  type ProviderHeaders,
  type ProviderModel,
  type StreamRequest,
} from "./ai-provider-interface";
import { providerFetch } from "./provider-fetch";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const NON_CHAT_MODEL_PATTERN =
  /(embed|rerank|moderation|safety|guard|tts|text-to-speech|speech|audio|parakeet|ocr|image-generation|clip)/i;

function formatModelName(id: string, name?: string): string {
  if (name?.trim()) return name.trim();
  return id
    .split("/")
    .pop()
    ?.replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase()) || id;
}

export class NvidiaProvider extends AIProvider {
  async getModels(apiKey?: string): Promise<ProviderModel[]> {
    if (!apiKey?.trim()) return [];

    try {
      const response = await providerFetch(`${NVIDIA_BASE_URL}/models`, {
        method: "GET",
        headers: this.buildHeaders(apiKey),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as {
        data?: Array<{
          id?: string;
          name?: string;
          max_model_len?: number;
          max_context_length?: number;
        }>;
      };

      return (data.data ?? [])
        .filter((model) => {
          const id = model.id?.trim() ?? "";
          return id.length > 0 && !NON_CHAT_MODEL_PATTERN.test(id);
        })
        .map((model) => ({
          id: model.id!.trim(),
          name: formatModelName(model.id!.trim(), model.name),
          maxTokens: model.max_context_length ?? model.max_model_len,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      console.error(`${this.id} model fetch error:`, error);
      return [];
    }
  }

  buildHeaders(apiKey?: string): ProviderHeaders {
    return {
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };
  }

  buildPayload(request: StreamRequest): Record<string, unknown> {
    return {
      model: request.modelId,
      messages: request.messages,
      max_completion_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: true,
      ...(request.responseFormat
        ? { response_format: { type: request.responseFormat } }
        : {}),
    };
  }

  buildUrl(): string {
    return `${NVIDIA_BASE_URL}/chat/completions`;
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey.trim()) return false;

    try {
      const response = await providerFetch(`${NVIDIA_BASE_URL}/models`, {
        method: "GET",
        headers: this.buildHeaders(apiKey),
      });
      return response.ok;
    } catch (error) {
      console.error(`${this.id} API key validation error:`, error);
      return false;
    }
  }
}
