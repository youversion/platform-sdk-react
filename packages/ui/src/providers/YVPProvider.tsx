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
  SignInWithYouVersionResult,
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
    const initializeAuth = () => {
      // Set configuration
      YouVersionPlatformConfiguration.appKey = config.appKey;
      YouVersionPlatformConfiguration.installationId = config.installationId ?? null;

      // Register the authentication strategy
      const strategy = new WebAuthenticationStrategy({
        redirectUri: config.redirectUri || '',
      });
      AuthenticationStrategyRegistry.register(strategy);

      // Check for existing token
      const existingToken = YouVersionPlatformConfiguration.accessToken;
      if (existingToken) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          accessToken: existingToken,
          result: null,
          error: null,
        });
        return;
      }

      // Handle authentication callback
      WebAuthenticationStrategy.handleCallback();
      const storedCallback = WebAuthenticationStrategy.getStoredCallback();

      if (storedCallback) {
        try {
          const result = new SignInWithYouVersionResult(storedCallback);
          const { accessToken, errorMsg } = result;

          if (accessToken) {
            YouVersionPlatformConfiguration.setAccessToken(accessToken);
          }

          setAuthState({
            isAuthenticated: !!accessToken,
            isLoading: false,
            accessToken: accessToken ?? null,
            result,
            error: errorMsg ? new Error(errorMsg) : null,
          });
        } catch (error) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            accessToken: null,
            result: null,
            error: error as Error,
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          accessToken: null,
          result: null,
          error: null,
        });
      }
    };

    initializeAuth();
  }, [config.appKey, config.installationId, config.redirectUri]);

  const signOut = useCallback(() => {
    YouVersionPlatformConfiguration.setAccessToken(null);
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      result: null,
      error: null,
    });
  }, []);

  const fetchUserInfo = useCallback(async (): Promise<YouVersionUserInfo> => {
    if (!authState.isAuthenticated || !authState.accessToken) {
      throw new Error('User is not authenticated');
    }

    return YouVersionAPIUsers.userInfo(authState.accessToken);
  }, [authState.isAuthenticated, authState.accessToken]);

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
