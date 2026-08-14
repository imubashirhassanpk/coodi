interface UseDesktopSignInOptions {
  apiBase?: string;
  onSuccess?: () => void;
}

/**
 * Coodi does not have an account or hosted sign-in flow. The hook remains as a
 * compatibility surface for older components but never opens a browser or
 * contacts an authentication service.
 */
export function useDesktopSignIn(_options: UseDesktopSignInOptions = {}) {
  const signIn = async () => {
    throw new Error("Coodi is account-free; sign-in is disabled.");
  };

  return {
    isSigningIn: false,
    signIn,
  };
}
