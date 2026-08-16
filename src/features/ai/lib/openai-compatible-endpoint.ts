const CHAT_COMPLETIONS_SUFFIX = "/chat/completions";
const MODELS_SUFFIX = "/models";

export function normalizeOpenAICompatibleBaseUrl(value: string | undefined | null): string {
  let normalized = value?.trim().replace(/\/+$/, "") || "";
  const lowerCase = normalized.toLowerCase();

  if (lowerCase.endsWith(CHAT_COMPLETIONS_SUFFIX)) {
    normalized = normalized.slice(0, -CHAT_COMPLETIONS_SUFFIX.length).replace(/\/+$/, "");
  } else if (lowerCase.endsWith(MODELS_SUFFIX)) {
    normalized = normalized.slice(0, -MODELS_SUFFIX.length).replace(/\/+$/, "");
  }

  return normalized;
}

export function validateOpenAICompatibleBaseUrl(value: string | undefined | null): string {
  const normalized = normalizeOpenAICompatibleBaseUrl(value);
  if (!normalized) {
    throw new Error("An OpenAI-compatible base URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("OpenAI-compatible base URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("OpenAI-compatible base URL must use http:// or https://.");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("OpenAI-compatible base URL must not include a query or hash.");
  }

  return normalized;
}

export function getOpenAICompatibleChatCompletionsUrl(baseUrl: string): string {
  return `${validateOpenAICompatibleBaseUrl(baseUrl)}${CHAT_COMPLETIONS_SUFFIX}`;
}

export function getOpenAICompatibleModelsUrl(baseUrl: string): string {
  return `${validateOpenAICompatibleBaseUrl(baseUrl)}${MODELS_SUFFIX}`;
}
