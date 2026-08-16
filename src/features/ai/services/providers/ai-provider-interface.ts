import type { AIMessage } from "@/features/ai/types/messages.types";

export interface ProviderToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ProviderAssistantToolMessage {
  role: "assistant";
  content: string | null;
  tool_calls: ProviderToolCall[];
}

export interface ProviderToolResultMessage {
  role: "tool";
  tool_call_id: string;
  content: string;
}

export type ProviderChatMessage =
  | AIMessage
  | ProviderAssistantToolMessage
  | ProviderToolResultMessage;

export interface ProviderConfig {
  id: string;
  name: string;
  apiUrl: string;
  requiresApiKey: boolean;
  maxTokens: number;
}

export interface ProviderHeaders {
  [key: string]: string;
}

export interface StreamRequest {
  modelId: string;
  messages: ProviderChatMessage[];
  maxTokens: number;
  tools?: ProviderToolDefinition[];
  toolChoice?: "auto";
  temperature: number;
  apiKey?: string;
  responseFormat?: "text" | "json_object";
}

export interface ProviderModel {
  id: string;
  name: string;
  maxTokens?: number;
  supportsToolCalling?: boolean;
}

export abstract class AIProvider {
  constructor(protected config: ProviderConfig) {}

  abstract buildHeaders(apiKey?: string): ProviderHeaders;
  abstract buildPayload(request: StreamRequest): any;
  abstract validateApiKey(apiKey: string): Promise<boolean>;

  // Optional: Allows providers to customize the URL (e.g., add API key as query param)
  buildUrl?(request: StreamRequest): string;

  // Optional: Allows providers to fetch available models dynamically
  async getModels?(apiKey?: string): Promise<ProviderModel[]> {
    void apiKey;
    return [];
  }

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get requiresApiKey(): boolean {
    return this.config.requiresApiKey;
  }
}
