import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  ApiClient,
  AuthenticationStrategyRegistry,
  YouVersionPlatformConfiguration,
  YouVersionAPIUsers,
  WebAuthenticationStrategy,
  type ApiConfig,
  type AuthenticationState,
  type YouVersionUserInfo,
} from '@youversion/platform-core';
import { YVPErrorBoundary } from './YVPErrorBoundary';

export interface YVPContextValue {
  config: ApiConfig;
  client: typeof ApiClient;
  auth: AuthenticationState;
  signOut: () => void;
  fetchUserInfo: () => Promise<YouVersionUserInfo>;
}

const YVPContext = createContext<YVPContextValue | null>(null);

export interface YVPProviderProps {
  config: ApiConfig;
  children: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  theme?: 'light' | 'dark';
  skipAuth?: boolean;
}

export function YVPProvider({
  config,
  children,
  errorFallback,
  onError,
  theme = 'light',
}: YVPProviderProps): React.ReactElement {
  const [authState, setAuthState] = useState<AuthenticationState>({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    result: null,
    error: null,
  });

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      // Set configuration
      YouVersionPlatformConfiguration.appId = config.appId;
      YouVersionPlatformConfiguration.installationId = config.installationId ?? null;

      // Register the authentication strategy
      const callbackPath = config.redirectUri
        ? new URL(config.redirectUri).pathname
        : '/auth/callback';
      const strategy = new WebAuthenticationStrategy({
        redirectUri: config.redirectUri,
        callbackPath,
      });
      AuthenticationStrategyRegistry.register(strategy);

      // Handle authentication callback and store it
      const wasCallback = WebAuthenticationStrategy.handleCallback(callbackPath);

      console.log('[YVP] Callback handled:', wasCallback);
      console.log('[YVP] Has stored callback:', WebAuthenticationStrategy.hasStoredCallback());

      // Check if we have a stored OAuth callback to complete
      if (WebAuthenticationStrategy.hasStoredCallback()) {
        // We just came back from OAuth - complete the PKCE flow
        setAuthState({
          isAuthenticated: false,
          isLoading: true,
          accessToken: null,
          result: null,
          error: null,
        });

        try {
          const result = await YouVersionAPIUsers.completeSignInFromStoredCallback();

          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            accessToken: result.accessToken,
            result,
            error: null,
          });
          return;
        } catch (error) {
          console.error('[YVP] Failed to complete sign-in from callback:', error);
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            accessToken: null,
            result: null,
            error: error as Error,
          });
          return;
        }
      }

      // No stored callback - check for existing token
      const existingToken = YouVersionPlatformConfiguration.accessToken;
      setAuthState({
        isAuthenticated: !!existingToken,
        isLoading: false,
        accessToken: existingToken,
        result: null,
        error: null,
      });
    };

    void initializeAuth();
  }, [config.appId, config.installationId, config.redirectUri]);

  const signOut = useCallback(() => {
    YouVersionAPIUsers.signOut();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      result: null,
      error: null,
    });
  }, []);

  const fetchUserInfo = useCallback((): Promise<YouVersionUserInfo> => {
    // User info now comes from SignInWithYouVersionResult during sign-in
    // This method is deprecated but kept for backward compatibility
    return Promise.reject(
      new Error(
        'User info is now included in SignInWithYouVersionResult. Access it via auth.result after sign-in.',
      ),
    );
  }, []);

  const value: YVPContextValue = {
    config,
    client: ApiClient,
    auth: authState,
    signOut,
    fetchUserInfo,
  };

  return (
    <YVPErrorBoundary fallback={errorFallback} onError={onError}>
      <YVPContext.Provider value={value}>
        <div className="yv:contents" data-yv-sdk data-yv-theme={theme}>
          {children}
        </div>
      </YVPContext.Provider>
    </YVPErrorBoundary>
  );
}

export function useYVP(): YVPContextValue {
  const context = useContext(YVPContext);
  if (!context) {
    throw new Error('useYVP must be used within a YVPProvider');
  }
  return context;
}
