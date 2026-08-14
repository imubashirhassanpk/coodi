export function useProFeature() {
  return {
    isPro: false,
    hasSettingsSync: false,
    hasHostedAi: false,
    isAuthenticated: false,
    subscriptionStatus: "free" as const,
  };
}
