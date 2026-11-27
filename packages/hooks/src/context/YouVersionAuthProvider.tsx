'use client';

import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  YouVersionUserInfo,
  getLocalStorage,
  type YouVersionUserInfoJSON,
} from '@youversion/platform-core';
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const [accountRevision, setAccountRevision] = useState(0);
  const legacySession = useRef<{
    userId: string | null;
    accessToken: string;
    refreshToken: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isHostControlled) return;
    setUserInfo(controlledUserInfo ? new YouVersionUserInfo(controlledUserInfo) : null);
    setIsLoading(false);
  }, [isHostControlled, controlledUserInfo]);

  useEffect(() => {
    if (isHostControlled) return;
    setIsLoading(true);
    legacySession.current = null;
    let mounted = true;
    let sessionChanged = false;
    const initAuth = async () => {
      // Set configuration
      YouVersionPlatformConfiguration.appKey = config.appKey;
      YouVersionPlatformConfiguration.apiHost = config.apiHost ?? 'api.youversion.com';

      if (globalThis.window) {
        const accessToken = YouVersionPlatformConfiguration.accessToken;
        const refreshToken = YouVersionPlatformConfiguration.refreshToken;
        const userId = YouVersionPlatformConfiguration.storedUserInfo?.id ?? null;
        let legacyFallback = accessToken ? { userId, accessToken, refreshToken } : null;
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
              legacyFallback = null;
              const storedUser = YouVersionAPIUsers.getStoredUserInfo();
              const refreshToken = result.refreshToken || null;
              const callbackMatchesSession =
                storedUser?.userId === result.yvpUserId &&
                result.accessToken === YouVersionPlatformConfiguration.accessToken &&
                refreshToken === YouVersionPlatformConfiguration.refreshToken;
              if (!sessionChanged || callbackMatchesSession) setUserInfo(storedUser);
              if (callbackMatchesSession && result.accessToken) {
                legacySession.current = {
                  userId: result.yvpUserId ?? null,
                  accessToken: result.accessToken,
                  refreshToken,
                };
                setOAuthCallbackState(state);
              } else if (sessionChanged) setOAuthCallbackSuperseded(true);
            }
          } catch (err) {
            if (!mounted) return;
            const error = err instanceof Error ? err : new Error('Auth callback failed');
            if (process.env.NODE_ENV === 'development') {
              console.error('Auth callback failed:', error);
            }
            if (error.name === 'OAuthCallbackSupersededError') {
              legacyFallback = null;
              setOAuthCallbackSuperseded(true);
            } else {
              const failedState =
                error.name === 'VerifiedOAuthCallbackError' ? state : pendingState;
              if (!failedState) legacyFallback = null;
              setOAuthFailedCallbackState(failedState);
            }
            if (!sessionChanged) {
              setError(error);
              setUserInfo(getCredentialedUserInfo());
            }
          }
        } else {
          if (refreshToken) {
            legacyFallback = null;
            let initializedAccessToken = accessToken;
            let initializedRefreshToken = refreshToken;
            try {
              // refreshTokenIfNeeded clears tokens (and the stored profile)
              // when the session has expired and cannot be refreshed.
              const refreshed = await YouVersionAPIUsers.refreshTokenIfNeeded(
                ({ result, previousSession }) => {
                  if (
                    previousSession.accessToken === accessToken &&
                    previousSession.refreshToken === refreshToken &&
                    (previousSession.userId ?? null) === userId &&
                    result.accessToken &&
                    result.refreshToken
                  ) {
                    initializedAccessToken = result.accessToken;
                    initializedRefreshToken = result.refreshToken;
                  }
                },
              );
              if (!mounted) return;
              if (!sessionChanged) {
                const storedUser = refreshed ? YouVersionAPIUsers.getStoredUserInfo() : null;
                setUserInfo(storedUser);
                if (
                  refreshed &&
                  initializedAccessToken &&
                  (storedUser?.userId ?? null) === userId
                ) {
                  legacySession.current = {
                    userId,
                    accessToken: initializedAccessToken,
                    refreshToken: initializedRefreshToken,
                  };
                }
              }
            } catch {
              if (!mounted) return;
              if (!sessionChanged) setUserInfo(null);
            }
          } else {
            setUserInfo(null);
          }
        }
        if (mounted && !sessionChanged && legacyFallback) legacySession.current = legacyFallback;
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
      const accountChanged = YouVersionPlatformConfiguration.didStoredAccountChange(event);
      const snapshot = legacySession.current;
      if (
        accountChanged ||
        (snapshot &&
          (YouVersionPlatformConfiguration.refreshToken !== snapshot.refreshToken ||
            YouVersionPlatformConfiguration.getOAuthAccessToken(
              snapshot.userId,
              undefined,
              snapshot,
            ) !== snapshot.accessToken))
      ) {
        legacySession.current = null;
      }
      if (accountChanged) {
        setAccountRevision((revision) => revision + 1);
      }
      setOAuthCallbackState(null);
      setOAuthFailedCallbackState(null);
      setUserInfo(getCredentialedUserInfo());
    }

    const unsubscribeRotation = YouVersionAPIUsers.onTokenRotation(
      ({ result, previousSession }) => {
        const current = legacySession.current;
        if (
          current &&
          current.userId === (previousSession.userId ?? null) &&
          current.accessToken === previousSession.accessToken &&
          current.refreshToken === previousSession.refreshToken &&
          result.accessToken
        ) {
          legacySession.current = {
            userId: current.userId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || null,
          };
        }
      },
    );
    globalThis.window?.addEventListener?.('storage', syncSession);
    void initAuth();
    return () => {
      mounted = false;
      unsubscribeRotation();
      globalThis.window?.removeEventListener?.('storage', syncSession);
    };
  }, [isHostControlled]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: AuthContextValue = {
    userInfo,
    setUserInfo,
    isLoading,
    error,
    redirectUri: config.redirectUri,
    get accessToken() {
      if (isHostControlled) return null;
      const snapshot = legacySession.current;
      return YouVersionPlatformConfiguration.getOAuthAccessToken(
        userInfo?.userId ?? snapshot?.userId ?? null,
        undefined,
        snapshot ?? undefined,
      );
    },
    accountRevision,
    oauthCallbackState,
    oauthFailedCallbackState,
    oauthCallbackSuperseded,
    isHostControlled,
  };

  return <YouVersionAuthContext.Provider value={value}>{children}</YouVersionAuthContext.Provider>;
}
