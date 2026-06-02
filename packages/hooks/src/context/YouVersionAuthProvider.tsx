'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type YouVersionUserInfo,
} from '@youversion/platform-core';
import { YouVersionAuthContext } from './YouVersionAuthContext';
import type { AuthConfig, AuthContextValue } from '../types/auth';

interface YouVersionAuthProviderProps {
  config: AuthConfig;
  children: ReactNode;
}

export default function YouVersionAuthProvider({
  config,
  children,
}: YouVersionAuthProviderProps): React.ReactElement {
  const [userInfo, setUserInfo] = useState<YouVersionUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
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
            if (result) {
              // handleAuthCallback persists the decoded profile; read it back.
              if (!mounted) return;
              setUserInfo(YouVersionAPIUsers.getStoredUserInfo());
            }
          } catch (err) {
            if (!mounted) return;
            setError(err as Error);
          }
        } else {
          // Check for existing token
          const refreshToken = YouVersionPlatformConfiguration.refreshToken;
          if (refreshToken) {
            try {
              // refreshTokenIfNeeded clears tokens (and the stored profile)
              // when the session has expired and cannot be refreshed.
              const refreshed = await YouVersionAPIUsers.refreshTokenIfNeeded();
              if (!mounted) return;
              setUserInfo(refreshed ? YouVersionAPIUsers.getStoredUserInfo() : null);
            } catch {
              if (!mounted) return;
              setUserInfo(null);
            }
          }
        }
      }

      if (!mounted) return;
      setIsLoading(false);
    };

    void initAuth();
    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextValue = {
    userInfo,
    setUserInfo,
    isLoading,
    error,
    redirectUri: config.redirectUri,
  };

  return <YouVersionAuthContext.Provider value={value}>{children}</YouVersionAuthContext.Provider>;
}
