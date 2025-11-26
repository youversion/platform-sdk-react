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
  SignInWithYouVersionResult,
  YouVersionPlatformConfiguration,
  YouVersionAPIUsers,
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
  fetchUserInfo: () => YouVersionUserInfo;
}

const YVPContext = createContext<YVPContextValue | null>(null);

export interface YVPProviderProps {
  config: ApiConfig;
  children: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  theme?: 'light' | 'dark';
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
    idToken: null,
    result: null,
    error: null,
  });

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      // Set configuration
      YouVersionPlatformConfiguration.appKey = config.appKey;
      YouVersionPlatformConfiguration.installationId = config.installationId ?? null;

      // Check for existing token first
      const existingToken = YouVersionPlatformConfiguration.accessToken;
      if (existingToken) {
        try {
          // Try to refresh token if needed before using it
          const refreshSuccess = await YouVersionAPIUsers.refreshTokenIfNeeded();

          if (!refreshSuccess) {
            // Refresh failed, tokens should be cleared already
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              accessToken: null,
              idToken: null,
              result: null,
              error: null,
            });
            return;
          }

          // Get the (possibly refreshed) tokens
          const currentToken = YouVersionPlatformConfiguration.accessToken;
          const storedIdToken = YouVersionPlatformConfiguration.idToken;
          if (currentToken && storedIdToken) {
            // Fetch user info with id token
            const userInfo = YouVersionAPIUsers.userInfo(storedIdToken);
            // Convert YouVersionUserInfo to SignInWithYouVersionResult format
            const result = new SignInWithYouVersionResult({
              accessToken: currentToken,
              yvpUserId: userInfo.userId,
              name: userInfo.name,
              profilePicture: userInfo.avatarUrl?.toString(),
            });
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              accessToken: currentToken,
              idToken: storedIdToken,
              result: result,
              error: null,
            });
          }
        } catch (error) {
          // Token might be expired or invalid, clear it
          YouVersionPlatformConfiguration.clearAuthTokens();
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            accessToken: null,
            idToken: null,
            result: null,
            error: error as Error,
          });
        }
        return;
      }

      // Handle authentication callback
      try {
        const authResult = await YouVersionAPIUsers.handleAuthCallback();

        if (authResult) {
          // Callback was processed, use the returned authentication result
          const accessToken = YouVersionPlatformConfiguration.accessToken;
          const idToken = YouVersionPlatformConfiguration.idToken;

          setAuthState({
            isAuthenticated: !!accessToken,
            isLoading: false,
            accessToken: accessToken ?? null,
            idToken: idToken,
            result: authResult,
            error: null,
          });
        } else {
          // No callback, user is not authenticated
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            accessToken: null,
            idToken: null,
            result: null,
            error: null,
          });
        }
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          accessToken: null,
          idToken: null,
          result: null,
          error: error as Error,
        });
      }
    };

    void initializeAuth();
  }, [config.appKey, config.installationId, config.redirectUri]);

  const signOut = useCallback(() => {
    YouVersionPlatformConfiguration.clearAuthTokens();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      idToken: null,
      result: null,
      error: null,
    });
  }, []);

  const fetchUserInfo = useCallback((): YouVersionUserInfo => {
    if (!authState.isAuthenticated || !authState.idToken) {
      throw new Error('User is not authenticated');
    }

    return YouVersionAPIUsers.userInfo(authState.idToken);
  }, [authState.isAuthenticated, authState.idToken]);

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
