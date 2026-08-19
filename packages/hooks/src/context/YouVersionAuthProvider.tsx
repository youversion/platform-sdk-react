'use client';

import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  YouVersionUserInfo,
  type YouVersionUserInfoJSON,
} from '@youversion/platform-core';
import React, { useEffect, useState, type ReactNode } from 'react';
import type { AuthConfig, AuthContextValue } from '../types/auth';
import { YouVersionAuthContext } from './YouVersionAuthContext';

interface YouVersionAuthProviderProps {
  config: AuthConfig;
  /**
   * Host-controlled auth state. When provided (including `null`), the host owns
   * sign-in (e.g. the React Native Expo SDK signs in natively and passes the
   * resulting profile down). In that mode the web token/OAuth init is skipped and
   * this value drives `userInfo`/`isAuthenticated`. Leave `undefined` for the
   * default web-managed flow.
   */
  userInfo?: YouVersionUserInfoJSON | null;
  children: ReactNode;
}

export default function YouVersionAuthProvider({
  config,
  userInfo: controlledUserInfo,
  children,
}: YouVersionAuthProviderProps): React.ReactElement {
  const isHostControlled = controlledUserInfo !== undefined;
  const [userInfo, setUserInfo] = useState<YouVersionUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isHostControlled) return;
    setUserInfo(controlledUserInfo ? new YouVersionUserInfo(controlledUserInfo) : null);
    setIsLoading(false);
  }, [isHostControlled, controlledUserInfo]);

  useEffect(() => {
    if (isHostControlled) return;
    let mounted = true;
    const initAuth = async () => {
      // Set configuration
      YouVersionPlatformConfiguration.appKey = config.appKey;
      YouVersionPlatformConfiguration.apiHost = config.apiHost ?? 'api.youversion.com';

      if (globalThis.window) {
        // Check for OAuth callback
        const urlParams = new URLSearchParams(globalThis.window.location.search);
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
            setError(err instanceof Error ? err : new Error('Auth callback failed'));
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
