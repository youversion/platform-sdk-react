'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type YouVersionUserInfo,
} from '@youversion/platform-core';
import { YVAuthContext } from './YVAuthContext';
import type { AuthConfig, AuthContextValue } from '../types/auth';

export interface YVAuthProviderProps {
  config: AuthConfig;
  children: ReactNode;
}

export function YVAuthProvider({ config, children }: YVAuthProviderProps): React.ReactElement {
  const [userInfo, setUserInfo] = useState<YouVersionUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      // Set configuration
      YouVersionPlatformConfiguration.appKey = config.appKey;
      YouVersionPlatformConfiguration.apiHost = config.apiHost ?? 'api.youversion.com';

      if (typeof window !== 'undefined') {
        // Check for OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const isOAuthCallback = urlParams.has('state') || urlParams.has('error');

        if (isOAuthCallback) {
          try {
            const result = await YouVersionAPIUsers.handleAuthCallback();
            if (result && YouVersionPlatformConfiguration.idToken) {
              const info = YouVersionAPIUsers.userInfo(YouVersionPlatformConfiguration.idToken);
              setUserInfo(info);
            }
          } catch (err) {
            setError(err as Error);
          }
        } else {
          // Check for existing token
          const refreshToken = YouVersionPlatformConfiguration.refreshToken;
          if (refreshToken) {
            try {
              await YouVersionAPIUsers.refreshTokenIfNeeded();
              const idToken = YouVersionPlatformConfiguration.idToken;
              if (idToken) {
                const info = YouVersionAPIUsers.userInfo(idToken);
                setUserInfo(info);
              } else {
                setUserInfo(null);
              }
            } catch {
              setUserInfo(null);
            }
          }
        }
      }

      setIsLoading(false);
    };

    void initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextValue = {
    userInfo,
    setUserInfo,
    isLoading,
    error,
  };

  return <YVAuthContext.Provider value={value}>{children}</YVAuthContext.Provider>;
}
