import type { SubscriptionInfo } from "@/features/window/services/auth-api";

/**
 * Coodi is distributed in self-managed BYOK mode. It does not proxy requests
 * through an upstream paid hosted-AI service, so a provider must have either a
 * user-managed key or be a local/no-key provider such as Ollama.
 */
export function canUseHostedProvider(
  _providerId: string,
  _subscription: SubscriptionInfo | null,
): boolean {
  return false;
}

export function canUseProviderWithoutApiKey(params: {
  providerId: string;
  subscription: SubscriptionInfo | null;
  hasStoredKey: boolean;
  requiresApiKey: boolean;
}): boolean {
  const { providerId, subscription, hasStoredKey, requiresApiKey } = params;

  if (!requiresApiKey) return true;
  if (hasStoredKey) return true;

  return canUseHostedProvider(providerId, subscription);
}
