'use client';

import { useCallback, useContext, useMemo } from 'react';
import {
  DataExchangeClient,
  buildDataExchangeUrl,
  handleDataExchangeCallback,
  SignInWithYouVersionPermission,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type DataExchangeCallbackResult,
} from '@youversion/platform-core';
import { YouVersionContext } from './context';
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
export function useHighlightAuthActions(): {
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
   * One-fell-swoop: full-page redirect to sign-in, requesting the `highlights`
   * permission alongside `profile`. Returns to `redirectUrl` (or the auth
   * provider's configured `redirectUri`, falling back to the current URL).
   */
  startSignInForHighlights: (redirectUrl?: string) => Promise<void>;
  /**
   * Just-in-time: mint a data-exchange token then full-page redirect to the
   * hosted consent page for the `highlights` permission.
   */
  startDataExchangeForHighlights: () => Promise<void>;
} {
  const context = useContext(YouVersionContext);
  const authContext = useContext(YouVersionAuthContext);
  const redirectUri = authContext?.redirectUri;

  const apiClient = useApiClient({ optional: true });
  const dataExchangeClient = useMemo(
    () => (apiClient ? new DataExchangeClient(apiClient) : null),
    [apiClient],
  );

  const startSignInForHighlights = useCallback(
    async (redirectUrl?: string) => {
      const url =
        redirectUrl ??
        redirectUri ??
        (typeof window !== 'undefined' ? window.location.href : undefined);
      if (!url) {
        throw new Error('A redirect URL is required to start sign-in for highlights.');
      }
      await YouVersionAPIUsers.signIn(url, ['profile'], [HIGHLIGHTS_PERMISSION]);
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
    const token = await dataExchangeClient.updateToken([HIGHLIGHTS_PERMISSION]);
    if (typeof window !== 'undefined') {
      window.location.href = buildDataExchangeUrl(token, context.appKey, context.apiHost);
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
