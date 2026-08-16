import {
  AIProvider,
  type ProviderHeaders,
  type ProviderModel,
  type StreamRequest,
} from "./ai-provider-interface";
import { DEFAULT_NVIDIA_MODEL_ID } from "@/features/ai/types/providers.types";
import { providerFetch } from "./provider-fetch";

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export { DEFAULT_NVIDIA_MODEL_ID };

const NON_CHAT_MODEL_PATTERN =
  /(embed|rerank|moderation|safety|guard|tts|text-to-speech|speech|audio|parakeet|ocr|image-generation|clip|video|detector|parse|retriever|calibration|translate|translation|diffusion|deplot)/i;

async function getNvidiaErrorMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  if (!body.trim()) return `${response.status} ${response.statusText}`.trim();

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const error = parsed.error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Keep the plain response body for non-JSON NVIDIA errors.
  }

  return body.trim().slice(0, 240);
}

function formatModelName(id: string, name?: string): string {
  if (name?.trim()) return name.trim();
  return (
    id
      .split("/")
      .pop()
      ?.replace(/[-_]+/g, " ")
      .replace(/\b[a-z]/g, (character) => character.toUpperCase())
      .replace(/(\d)([a-z])\b/gi, (_match, digit: string, character: string) =>
        `${digit}${character.toUpperCase()}`,
      ) || id
  );
}

export class NvidiaProvider extends AIProvider {
  async getModels(apiKey?: string): Promise<ProviderModel[]> {
    if (!apiKey?.trim()) return [];

    try {
      const response = await providerFetch(`${NVIDIA_BASE_URL}/models`, {
        method: "GET",
        headers: this.buildHeaders(apiKey),
      });

      if (!response.ok) {
        throw new Error(`NVIDIA model discovery failed: ${await getNvidiaErrorMessage(response)}`);
      }

      const data = (await response.json()) as {
        data?: Array<{
          id?: string;
          name?: string;
          max_model_len?: number;
          max_context_length?: number;
        }>;
        models?: Array<{
          id?: string;
          name?: string;
          max_model_len?: number;
          max_context_length?: number;
        }>;
      };
      const models = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
      const uniqueModels = new Map<string, ProviderModel>();

      for (const model of models) {
        const id = model.id?.trim() ?? "";
        const name = model.name?.trim() ?? "";
        if (!id || NON_CHAT_MODEL_PATTERN.test(`${id} ${name}`)) continue;
        if (uniqueModels.has(id)) continue;

        const parsedModel: ProviderModel = {
          id,
          name: formatModelName(id, name),
        };
        const maxTokens = model.max_context_length ?? model.max_model_len;
        if (typeof maxTokens === "number") parsedModel.maxTokens = maxTokens;
        uniqueModels.set(id, parsedModel);
      }

      return Array.from(uniqueModels.values()).sort((left, right) =>
        left.name.localeCompare(right.name),
      );
    } catch (error) {
      console.error(`${this.id} model fetch error:`, error);
      throw error;
    }
  }

  buildHeaders(apiKey?: string): ProviderHeaders {
    return {
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
      ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
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
