import {
  AIProvider,
  type ProviderHeaders,
  type ProviderModel,
  type StreamRequest,
} from "./ai-provider-interface";
import { providerFetch } from "./provider-fetch";

interface OpenRouterModel {
  id?: string;
  name?: string;
  top_provider?: { max_completion_tokens?: number };
  context_length?: number;
}

export class OpenRouterProvider extends AIProvider {
  async getModels(apiKey?: string): Promise<ProviderModel[]> {
    try {
      const response = await providerFetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: this.buildHeaders(apiKey),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as { data?: OpenRouterModel[] };
      return (data.data ?? [])
        .filter((model) => Boolean(model.id?.trim()))
        .map((model) => ({
          id: model.id!.trim(),
          name: model.name?.trim() || model.id!.trim(),
          maxTokens: model.top_provider?.max_completion_tokens ?? model.context_length,
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
      "HTTP-Referer": "https://www.mubashirhassan.com/coodi",
      "X-Title": "Coodi",
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
      ...(request.responseFormat ? { response_format: { type: request.responseFormat } } : {}),
    };
  }

  buildUrl(): string {
    return "https://openrouter.ai/api/v1/chat/completions";
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey.trim()) return false;

    try {
      const response = await providerFetch("https://openrouter.ai/api/v1/key", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch (error) {
      console.error(`${this.id} API key validation error:`, error);
      return false;
    }
  }
}
