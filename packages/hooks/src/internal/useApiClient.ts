'use client';

import { useContext, useMemo } from 'react';
import { ApiClient } from '@youversion/platform-core';
import { YouVersionContext } from '../context';

/**
 * Returns the {@link ApiClient} every hook under a `YouVersionProvider` shares.
 *
 * The instance is built by `YouVersionProvider` and read off the context. It has
 * to be one instance for the whole tree: `ApiClient` deduplicates concurrent
 * GETs through a private per-instance map, so two sibling components asking for
 * the same endpoint in the same tick only collapse into one request when they
 * hold the same client. Building the client here in a `useMemo` gave every hook
 * instance its own map, which is why the dedup never fired in a real app.
 *
 * When the context carries no client — a consumer rendering
 * `YouVersionContext.Provider` by hand, which the exported context allows — this
 * falls back to a per-hook client built from the same config. That path works
 * but does not share in-flight requests between siblings.
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

  const providedClient = context?.apiClient ?? null;

  const fallbackClient = useMemo(() => {
    if (providedClient || !context?.appKey) return null;

    return new ApiClient({
      appKey: context.appKey,
      apiHost: context.apiHost,
      installationId: context.installationId,
      additionalHeaders: context.additionalHeaders,
      timeout: context.timeout,
    });
  }, [
    providedClient,
    context?.appKey,
    context?.apiHost,
    context?.installationId,
    context?.additionalHeaders,
    context?.timeout,
  ]);

  const client = providedClient ?? fallbackClient;

  if (!client) {
    if (optional) return null;
    throw new Error(
      'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
    );
  }

  return client;
}
