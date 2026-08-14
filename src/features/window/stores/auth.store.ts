import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { AuthUser, SubscriptionInfo } from "@/features/window/services/auth-api";
import {
  fetchCurrentUser,
  fetchSubscriptionStatus,
  getAuthToken,
  isAuthInvalidError,
  logoutFromServer,
  removeAuthToken,
  storeAuthToken,
} from "@/features/window/services/auth-api";
import { createSelectors } from "@/utils/zustand-selectors";

interface AuthState {
  user: AuthUser | null;
  subscription: SubscriptionInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  handleAuthCallback: (token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  setCollaborationSnapshot: (collaboration: SubscriptionInfo["collaboration"] | null) => void;
  logout: () => Promise<void>;
}

interface AuthStore extends AuthState {
  actions: AuthActions;
}

/**
 * Kept as a compatibility surface for older tests/extensions. Coodi itself is
 * account-free and does not invoke the hosted account APIs during normal use.
 */
export interface AuthStoreDependencies {
  fetchCurrentUser: typeof fetchCurrentUser;
  fetchSubscriptionStatus: typeof fetchSubscriptionStatus;
  getAuthToken: typeof getAuthToken;
  isAuthInvalidError: typeof isAuthInvalidError;
  logoutFromServer: typeof logoutFromServer;
  removeAuthToken: typeof removeAuthToken;
  storeAuthToken: typeof storeAuthToken;
}

const defaultAuthStoreDependencies: AuthStoreDependencies = {
  fetchCurrentUser,
  fetchSubscriptionStatus,
  getAuthToken,
  isAuthInvalidError,
  logoutFromServer,
  removeAuthToken,
  storeAuthToken,
};

export function createAuthStore(
  dependencies: AuthStoreDependencies = defaultAuthStoreDependencies,
) {
  return create<AuthStore>()(
    immer((set) => ({
      user: null,
      subscription: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      actions: {
        initialize: async () => {
          // Remove a legacy Coodi/Athas token once, without contacting a server.
          try {
            await dependencies.removeAuthToken();
          } catch {
            // Token cleanup is best effort; local editing must remain available.
          }
          set((state) => {
            state.user = null;
            state.subscription = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
          });
        },

        handleAuthCallback: async () => {
          throw new Error("Coodi does not use accounts or hosted sign-in.");
        },

        refreshUser: async () => {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
          });
        },

        refreshSubscription: async () => {
          set((state) => {
            state.subscription = null;
          });
        },

        setCollaborationSnapshot: () => {
          // Account-backed collaboration snapshots are disabled in local-only mode.
        },

        logout: async () => {
          try {
            await dependencies.removeAuthToken();
          } catch {
            // Local sign-out is already complete if no legacy token exists.
          }
          set((state) => {
            state.user = null;
            state.subscription = null;
            state.isAuthenticated = false;
            state.error = null;
          });
        },
      },
    })),
  );
}

export const useAuthStore = createSelectors(createAuthStore());
