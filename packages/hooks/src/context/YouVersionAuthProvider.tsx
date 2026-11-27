'use client';

import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  YouVersionUserInfo,
  getLocalStorage,
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

function getCredentialedUserInfo() {
  return YouVersionPlatformConfiguration.accessToken || YouVersionPlatformConfiguration.refreshToken
    ? YouVersionAPIUsers.getStoredUserInfo()
    : null;
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
  const [oauthCallbackState, setOAuthCallbackState] = useState<string | null>(null);
  const [oauthFailedCallbackState, setOAuthFailedCallbackState] = useState<string | null>(null);
  const [oauthCallbackSuperseded, setOAuthCallbackSuperseded] = useState(false);
  const [legacySession, setLegacySession] = useState<{
    userId: string;
    accessToken: string;
    refreshToken: string;
  } | null>(null);

  useEffect(() => {
    if (!isHostControlled) return;
    setUserInfo(controlledUserInfo ? new YouVersionUserInfo(controlledUserInfo) : null);
    setIsLoading(false);
  }, [isHostControlled, controlledUserInfo]);

  useEffect(() => {
    if (isHostControlled) return;
    let mounted = true;
    let sessionChanged = false;
    const initAuth = async () => {
      // Set configuration
      YouVersionPlatformConfiguration.appKey = config.appKey;
      YouVersionPlatformConfiguration.apiHost = config.apiHost ?? 'api.youversion.com';

      if (globalThis.window) {
        // Check for OAuth callback
        const urlParams = new URLSearchParams(globalThis.window.location.search);
        const state = urlParams.get('state');
        const isOAuthCallback = urlParams.has('state') || urlParams.has('error');

        if (isOAuthCallback) {
          const pendingState = state && YouVersionAPIUsers.isSignInPending(state) ? state : null;
          try {
            const result = await YouVersionAPIUsers.handleAuthCallback();
            // A verified state-only callback has already navigated to obtain the code.
            if (!result && state && !urlParams.get('code') && !urlParams.get('error')) {
              return;
            }
            if (result) {
              if (!mounted) return;
              const storedUser = YouVersionAPIUsers.getStoredUserInfo();
              const callbackMatchesSession =
                storedUser?.userId === result.yvpUserId &&
                result.accessToken === YouVersionPlatformConfiguration.accessToken;
              if (!sessionChanged || callbackMatchesSession) setUserInfo(storedUser);
              if (callbackMatchesSession) setOAuthCallbackState(state);
              else if (sessionChanged) setOAuthCallbackSuperseded(true);
            }
          } catch (err) {
            if (!mounted) return;
            const error = err instanceof Error ? err : new Error('Auth callback failed');
            if (process.env.NODE_ENV === 'development') {
              console.error('Auth callback failed:', error);
            }
            if (error.name === 'OAuthCallbackSupersededError') setOAuthCallbackSuperseded(true);
            else setOAuthFailedCallbackState(pendingState);
            if (!sessionChanged) {
              setError(error);
              setUserInfo(getCredentialedUserInfo());
            }
          }
        } else {
          // Check for existing token
          const refreshToken = YouVersionPlatformConfiguration.refreshToken;
          if (refreshToken) {
            const accessToken = YouVersionPlatformConfiguration.accessToken;
            const userId = YouVersionPlatformConfiguration.storedUserInfo?.id;
            try {
              // refreshTokenIfNeeded clears tokens (and the stored profile)
              // when the session has expired and cannot be refreshed.
              const refreshed = await YouVersionAPIUsers.refreshTokenIfNeeded();
              if (!mounted) return;
              if (!sessionChanged) {
                const storedUser = refreshed ? YouVersionAPIUsers.getStoredUserInfo() : null;
                setUserInfo(storedUser);
                if (accessToken && userId && storedUser?.userId === userId) {
                  setLegacySession({ userId, accessToken, refreshToken });
                }
              }
            } catch {
              if (!mounted) return;
              if (!sessionChanged) setUserInfo(null);
            }
          }
        }
      }

      if (!mounted) return;
      setIsLoading(false);
    };

    function syncSession(event: StorageEvent) {
      if (
        event.storageArea !== getLocalStorage() ||
        (event.key !== null &&
          event.key !== 'userInfo' &&
          event.key !== 'accessToken' &&
          event.key !== 'refreshToken' &&
          event.key !== 'youversion-auth-scope')
      ) {
        return;
      }
      sessionChanged = true;
      setLegacySession(null);
      setOAuthCallbackState(null);
      setOAuthFailedCallbackState(null);
      setUserInfo(getCredentialedUserInfo());
    }

    globalThis.window?.addEventListener?.('storage', syncSession);
    void initAuth();
    return () => {
      mounted = false;
      globalThis.window?.removeEventListener?.('storage', syncSession);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextValue = {
    userInfo,
    setUserInfo,
    isLoading,
    error,
    redirectUri: config.redirectUri,
    accessToken:
      !isHostControlled && userInfo?.userId
        ? YouVersionPlatformConfiguration.getOAuthAccessToken(
            userInfo.userId,
            undefined,
            legacySession ?? undefined,
          )
        : null,
    oauthCallbackState,
    oauthFailedCallbackState,
    oauthCallbackSuperseded,
    isHostControlled,
  };

  return <YouVersionAuthContext.Provider value={value}>{children}</YouVersionAuthContext.Provider>;
}
