import { useMemo, useCallback } from 'react';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type AuthenticationState,
  type SignInWithYouVersionResult,
  type YouVersionUserInfo,
  type AuthenticationScopes,
  type SignInWithYouVersionPermissionValues,
} from '@youversion/platform-core';
import { useYouVersionAuthContext } from './context/YouVersionAuthContext';

export interface UseYVAuthReturn {
  // Main auth state
  auth: AuthenticationState;

  // Actions
  signIn: (params?: {
    redirectUrl?: string;
    scopes?: AuthenticationScopes[];
    permissions?: SignInWithYouVersionPermissionValues[];
  }) => Promise<void>;
  signOut: () => void;

  // Callback processing (for callback page) - caches user info
  processCallback: () => Promise<SignInWithYouVersionResult | null>;

  // Cached user info (populated after successful callback)
  userInfo: YouVersionUserInfo | null;

  // Redirect URI from provider config
  redirectUri?: string;
}

/**
 * Comprehensive YouVersion authentication hook using vanilla React.
 *
 * Provides complete auth functionality without external dependencies.
 * Sign-in redirects to YouVersion, callback processing caches user info.
 *
 * @returns Complete auth state and functionality
 *
 * @example
 * ```tsx
 * // Sign-in page
 * import { useYVAuth, SignInWithYouVersionPermission } from '@youversion/platform-react-hooks';
 *
 * function SignInPage() {
 *   const { auth, signIn } = useYVAuth();
 *
 *   const handleSignIn = async () => {
 *     try {
 *       await signIn({
 *         redirectUrl: 'https://myapp.com/callback',
 *       });
 *     } catch (error) {
 *       console.error('Sign in failed:', error);
 *     }
 *   };
 *
 *   if (auth.isAuthenticated) {
 *     return <div>Already signed in!</div>;
 *   }
 *
 *   return (
 *     <button onClick={handleSignIn} disabled={auth.isLoading}>
 *       {auth.isLoading ? 'Signing in...' : 'Sign In'}
 *     </button>
 *   );
 * }
 *
 * // Callback page
 * function CallbackPage() {
 *   const { processCallback } = useYVAuth();
 *   const [isProcessing, setIsProcessing] = useState(true);
 *
 *   useEffect(() => {
 *     processCallback()
 *       .then(result => {
 *         if (result) {
 *           console.log('Auth success:', result.name);
 *           // User info is now cached
 *           // Redirect to app
 *         }
 *       })
 *       .catch(error => {
 *         console.error('Auth failed:', error);
 *       })
 *       .finally(() => {
 *         setIsProcessing(false);
 *       });
 *   }, [processCallback]);
 *
 *   return (
 *     <div>
 *       {isProcessing ? 'Processing authentication...' : 'Authentication complete'}
 *     </div>
 *   );
 * }
 *
 * // App with cached user info
 * function App() {
 *   const { auth, userInfo, signOut } = useYVAuth();
 *
 *   if (!auth.isAuthenticated) {
 *     return <SignInPage />;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {userInfo?.name || 'User'}!</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useYVAuth(): UseYVAuthReturn {
  // Get auth state from provider context
  const { userInfo, setUserInfo, isLoading, error, redirectUri } = useYouVersionAuthContext();

  // Derive authentication state
  const isAuthenticated = !!userInfo;

  // Read persisted auth data on every render so callbacks and refreshes are
  // reflected in consumers instead of being frozen at the hook's first mount.
  const accessToken = YouVersionPlatformConfiguration.accessToken;

  // Sign in function
  const signIn = useCallback(
    async (params?: {
      redirectUrl?: string;
      scopes?: AuthenticationScopes[];
      permissions?: SignInWithYouVersionPermissionValues[];
    }) => {
      const url = params?.redirectUrl ?? redirectUri;
      if (!url) {
        throw new Error(
          'redirectUrl is required. Provide it via signIn params or configure redirectUri in the auth provider.',
        );
      }
      await YouVersionAPIUsers.signIn(url, params?.scopes, params?.permissions);
      // Note: This will redirect, so code after this won't execute
    },
    [redirectUri],
  );

  // Process callback function
  const processCallback = useCallback(async (): Promise<SignInWithYouVersionResult | null> => {
    const result = await YouVersionAPIUsers.handleAuthCallback();
    return result;
  }, []);

  // Derive auth state
  const auth: AuthenticationState = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      accessToken,
      result: null,
      error,
    }),
    [isAuthenticated, isLoading, accessToken, error],
  );

  // Sign out function
  const signOut = useCallback(() => {
    YouVersionPlatformConfiguration.clearAuthTokens();
    setUserInfo(null);
  }, []);

  return {
    auth,
    signIn,
    signOut,
    processCallback,
    userInfo,
    redirectUri,
  };
}
