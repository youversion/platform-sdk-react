'use client';

import { useContext, useMemo } from 'react';
import { ApiClient } from '@youversion/platform-core';
import { YouVersionContext } from '../context';

/**
 * @internal
 * Reads {@link YouVersionContext} and returns a memoized {@link ApiClient} built
 * from its config. Shared by the per-service client hooks so the client
 * construction (and its dependency array) lives in one place.
 *
 * By default it throws when no app key is configured (the contract every data
 * hook relies on). Pass `{ optional: true }` for the no-provider-tolerant
 * variant that returns `null` instead — used by `useHighlightAuthActions`,
 * which must not throw when no provider is mounted.
 */
export function useApiClient(options: { optional: true }): ApiClient | null;
export function useApiClient(options?: { optional?: false }): ApiClient;
export function useApiClient(options: { optional?: boolean } = {}): ApiClient | null {
  const context = useContext(YouVersionContext);
  const optional = options.optional ?? false;

  return useMemo(() => {
    if (!context?.appKey) {
      if (optional) return null;
      throw new Error(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    }

    return new ApiClient({
      appKey: context.appKey,
      apiHost: context.apiHost,
      installationId: context.installationId,
      additionalHeaders: context.additionalHeaders,
    });
  }, [
    context?.appKey,
    context?.apiHost,
    context?.installationId,
    context?.additionalHeaders,
    optional,
  ]);
}
