import { useMemo, useCallback } from 'react';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type AuthenticationState,
  type SignInWithYouVersionPermissionValues,
  type SignInWithYouVersionResult,
  type YouVersionUserInfo,
} from '@youversion/platform-core';
import { useYVAuthContext } from './context/YVAuthContext';

export interface UseYVAuthReturn {
  // Main auth state
  auth: AuthenticationState;

  // Actions
  signIn: (params: {
    redirectUrl: string;
    permissions?: SignInWithYouVersionPermissionValues[];
  }) => Promise<void>;
  signOut: () => void;

  // Callback processing (for callback page) - caches user info
  processCallback: () => Promise<SignInWithYouVersionResult | null>;

  // Cached user info (populated after successful callback)
  userInfo: YouVersionUserInfo | null;
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
 *         permissions: [SignInWithYouVersionPermission.bibles]
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
  const { userInfo, setUserInfo, isLoading, error } = useYVAuthContext();

  // Derive authentication state
  const isAuthenticated = !!userInfo;

  // Get current tokens for actions
  const authTokens = useMemo(() => {
    if (typeof window !== 'undefined') {
      return {
        accessToken: YouVersionPlatformConfiguration.accessToken,
        idToken: YouVersionPlatformConfiguration.idToken,
      };
    }
    return { accessToken: null, idToken: null };
  }, []);

  // Sign in function
  const signIn = useCallback(
    async ({
      redirectUrl,
      permissions = [],
    }: {
      redirectUrl: string;
      permissions?: SignInWithYouVersionPermissionValues[];
    }) => {
      await YouVersionAPIUsers.signIn(new Set(permissions), redirectUrl);
      // Note: This will redirect, so code after this won't execute
    },
    [],
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
      accessToken: authTokens.accessToken,
      idToken: authTokens.idToken,
      result: null,
      error,
    }),
    [isAuthenticated, isLoading, authTokens.accessToken, authTokens.idToken, error],
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
  };
}
