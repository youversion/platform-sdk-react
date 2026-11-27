'use client';

import { useCallback, useContext, useMemo } from 'react';
import {
  DataExchangeClient,
  buildDataExchangeUrl,
  handleDataExchangeCallback,
  SignInWithYouVersionPermission,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type AuthenticationScopes,
  type DataExchangeCallbackResult,
} from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { YouVersionAuthContext } from './context/YouVersionAuthContext';
import { useApiClient } from './internal/useApiClient';

const HIGHLIGHTS_PERMISSION = SignInWithYouVersionPermission.highlights;

/** Optimistic cache read; a 401/403 on a write is still the ultimate check. */
const hasHighlightsPermission = () =>
  YouVersionPlatformConfiguration.hasPermission(HIGHLIGHTS_PERMISSION);

/** Drops the cached `highlights` grant so the next attempt re-prompts. */
const invalidateHighlightsPermission = () =>
  YouVersionPlatformConfiguration.removeGrantedPermission(HIGHLIGHTS_PERMISSION);

/**
 * Reconciles the permission cache from a data-exchange return and cleans the
 * URL. Returns the parsed return (or `null` when this load is not one).
 */
const consumeDataExchangeReturn = () => handleDataExchangeCallback();

/**
 * The two-path auth actions the highlight auth flow (YPE-1034) needs, plus the
 * permission-cache reads. Kept UI-agnostic: it returns primitives the seam hook
 * (`useBibleReaderHighlights`) orchestrates; it renders nothing.
 *
 * Reads `YouVersionAuthContext` defensively (via `useContext`, not `useYVAuth`)
 * so it never throws when no auth provider is mounted — the seam hook treats "no
 * provider" and "signed out" the same and simply never invokes the redirects.
 */
export type UseHighlightAuthActionsResult = {
  /** Optimistic cache read; a 401/403 on a write is still the ultimate check. */
  hasHighlightsPermission: () => boolean;
  /** Drops the cached `highlights` grant so the next attempt re-prompts. */
  invalidateHighlightsPermission: () => void;
  /**
   * Reconciles the permission cache from a data-exchange return and cleans the
   * URL. Returns the parsed return (or `null` when this load is not one).
   */
  consumeDataExchangeReturn: () => DataExchangeCallbackResult | null;
  /**
   * Redirects to sign-in with the `highlights` permission and supplied OAuth
   * scopes. The scopes default to `profile` when omitted. Returns to `redirectUrl`
   * or the provider's `redirectUri`, falling back to the current URL.
   */
  startSignInForHighlights: (
    redirectUrl?: string,
    scopes?: AuthenticationScopes[],
  ) => Promise<void>;
  /**
   * Just-in-time: mint a data-exchange token then full-page redirect to the
   * hosted consent page for the `highlights` permission.
   */
  startDataExchangeForHighlights: () => Promise<void>;
};

export function useHighlightAuthActions(): UseHighlightAuthActionsResult {
  const context = useContext(YouVersionContext);
  const authContext = useContext(YouVersionAuthContext);
  const redirectUri = authContext?.redirectUri;

  const apiClient = useApiClient({ optional: true });
  const dataExchangeClient = useMemo(
    () => (apiClient ? new DataExchangeClient(apiClient) : null),
    [apiClient],
  );

  const startSignInForHighlights = useCallback(
    async (redirectUrl?: string, scopes: AuthenticationScopes[] = ['profile']) => {
      const url = redirectUrl ?? redirectUri ?? globalThis.window?.location.href;
      if (!url) {
        throw new Error('A redirect URL is required to start sign-in for highlights.');
      }
      await YouVersionAPIUsers.signIn(url, scopes, [HIGHLIGHTS_PERMISSION]);
    },
    [redirectUri],
  );

  const startDataExchangeForHighlights = useCallback(async () => {
    if (!dataExchangeClient || !context?.appKey) {
      throw new Error('YouVersion context is required to start a data exchange.');
    }
    // Record the initiator BEFORE minting the token. A mid-await user switch
    // (another tab) must not stamp the new session as the initiator — that
    // would let the callback honor a grant the new user never consented to.
    // Saving first fails closed on mismatch instead.
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();
    try {
      const token = await dataExchangeClient.updateToken([HIGHLIGHTS_PERMISSION]);
      if (globalThis.window) {
        globalThis.window.location.href = buildDataExchangeUrl(
          token,
          context.appKey,
          context.apiHost,
        );
      }
    } catch (error) {
      // Mint/redirect aborted — drop the initiator so a later unrelated
      // `granted` return cannot ride this abandoned attempt.
      YouVersionPlatformConfiguration.clearDataExchangeInitiator();
      throw error;
    }
  }, [dataExchangeClient, context?.appKey, context?.apiHost]);

  return {
    hasHighlightsPermission,
    invalidateHighlightsPermission,
    consumeDataExchangeReturn,
    startSignInForHighlights,
    startDataExchangeForHighlights,
  };
}
