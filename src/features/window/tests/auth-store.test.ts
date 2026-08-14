import { describe, expect, it, vi } from "vitest";
import type { AuthStoreDependencies } from "../stores/auth.store";
import { createAuthStore } from "../stores/auth.store";

function createDependencies(overrides: Partial<AuthStoreDependencies> = {}): AuthStoreDependencies {
  return {
    fetchCurrentUser: vi.fn(),
    fetchSubscriptionStatus: vi.fn(),
    getAuthToken: vi.fn(),
    isAuthInvalidError: vi.fn(),
    logoutFromServer: vi.fn(async () => {}),
    removeAuthToken: vi.fn(async () => {}),
    storeAuthToken: vi.fn(),
    ...overrides,
  };
}

describe("local-only auth store", () => {
  it("initializes without fetching an account or subscription", async () => {
    const dependencies = createDependencies();
    const store = createAuthStore(dependencies);

    await store.getState().actions.initialize();

    expect(dependencies.removeAuthToken).toHaveBeenCalledOnce();
    expect(dependencies.getAuthToken).not.toHaveBeenCalled();
    expect(dependencies.fetchCurrentUser).not.toHaveBeenCalled();
    expect(dependencies.fetchSubscriptionStatus).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      user: null,
      subscription: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it("rejects browser authentication callbacks", async () => {
    const dependencies = createDependencies();
    const store = createAuthStore(dependencies);

    await expect(store.getState().actions.handleAuthCallback("token")).rejects.toThrow(
      "does not use accounts",
    );
    expect(dependencies.storeAuthToken).not.toHaveBeenCalled();
    expect(dependencies.fetchCurrentUser).not.toHaveBeenCalled();
  });

  it("clears local account-shaped state without contacting a server", async () => {
    const dependencies = createDependencies();
    const store = createAuthStore(dependencies);
    store.setState({
      user: null,
      subscription: null,
      isAuthenticated: false,
      isLoading: false,
      error: "legacy error",
    });

    await store.getState().actions.refreshUser();
    await store.getState().actions.refreshSubscription();
    await store.getState().actions.logout();

    expect(dependencies.logoutFromServer).not.toHaveBeenCalled();
    expect(dependencies.removeAuthToken).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({
      user: null,
      subscription: null,
      isAuthenticated: false,
      error: null,
    });
  });
});
