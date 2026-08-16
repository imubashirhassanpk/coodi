import {
  CUSTOM_AUTOCOMPLETE_PROVIDER_ID,
} from "@/features/ai/lib/custom-provider-config";
import { getProviderApiToken } from "@/features/ai/services/ai-token-service";
import {
  getProvider,
  setCustomProviderBaseUrl,
} from "@/features/ai/services/providers/ai-provider-registry";
import { providerFetch } from "@/features/ai/services/providers/provider-fetch";
import { getApiBase } from "@/utils/api-base";

const API_BASE = getApiBase();

export interface AutocompleteModel {
  id: string;
  name: string;
}

class AutocompleteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AutocompleteError";
    this.status = status;
  }
}

type OpenRouterModelResponse = {
  data?: Array<{
    id?: string;
    name?: string;
  }>;
};

function parseModelListFromUnknown(payload: unknown): AutocompleteModel[] {
  let models: unknown[] = [];

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { models?: unknown }).models)
  ) {
    models = (payload as { models: unknown[] }).models;
  } else if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as OpenRouterModelResponse).data)
  ) {
    models = (payload as OpenRouterModelResponse).data as unknown[];
  }

  return models
    .map((model) => {
      if (!model || typeof model !== "object") return null;
      const candidate = model as { id?: unknown; name?: unknown };
      const id = typeof candidate.id === "string" ? candidate.id : "";
      const name = typeof candidate.name === "string" ? candidate.name : id;
      if (!id) return null;
      return { id, name };
    })
    .filter((model): model is AutocompleteModel => Boolean(model));
}

export interface FetchAutocompleteModelsOptions {
  provider?: "openrouter" | "custom";
  baseUrl?: string;
  apiKey?: string | null;
}

export async function fetchAutocompleteModels(
  options: FetchAutocompleteModelsOptions = {},
): Promise<AutocompleteModel[]> {
  if (options.provider === "custom") {
    const baseUrl = options.baseUrl?.trim() || "";
    if (!baseUrl) {
      throw new AutocompleteError("Custom autocomplete base URL is required.", 400);
    }

    setCustomProviderBaseUrl(baseUrl);
    const provider = getProvider("custom");
    if (!provider?.getModels) {
      throw new AutocompleteError("Custom provider model discovery is unavailable.", 500);
    }

    const apiKey = options.apiKey ?? (await getProviderApiToken(CUSTOM_AUTOCOMPLETE_PROVIDER_ID));
    const models = await provider.getModels(apiKey || undefined);
    return models.map((model) => ({
      id: model.id,
      name: model.name || model.id,
    }));
  }

  const response = await providerFetch(`${API_BASE}/api/ai/autocomplete/models`, {
    method: "GET",
  });

  if (response.ok) {
    const body = await response.json();
    return parseModelListFromUnknown(body);
  }

  const openRouterResponse = await providerFetch("https://openrouter.ai/api/v1/models", {
    method: "GET",
  });

  if (!openRouterResponse.ok) {
    throw new AutocompleteError(
      `Failed to fetch fallback models (${openRouterResponse.status})`,
      openRouterResponse.status,
    );
  }

  const openRouterBody = await openRouterResponse.json();
  return parseModelListFromUnknown(openRouterBody);
}
