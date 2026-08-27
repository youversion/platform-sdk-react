'use client';

import { useMemo, useCallback } from 'react';
import { HighlightsClient } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { useUserScope } from './internal/useUserScope';
import { useApiData, type UseApiDataOptions } from './useApiData';
import {
  type GetHighlightsOptions,
  type DeleteHighlightOptions,
  type CreateHighlight,
  type Collection,
  type Highlight,
} from '@youversion/platform-core';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseHighlightsResult = UseNamedQueryResult<'highlights', Collection<Highlight>> & {
  /**
   * Creates a highlight. Intentionally does NOT auto-refetch: a single logical
   * apply can fan out into several writes, so callers must call `refetch()` once
   * after their write batch settles. See the NOTE in the hook body for the why.
   */
  createHighlight: (data: CreateHighlight) => Promise<Highlight>;
  /**
   * Deletes a highlight. Intentionally does NOT auto-refetch: callers must call
   * `refetch()` once after their write batch settles. See the NOTE in the hook
   * body for the why.
   */
  deleteHighlight: (passageId: string, deleteOptions: DeleteHighlightOptions) => Promise<void>;
};

export function useHighlights(
  options: GetHighlightsOptions,
  apiOptions?: UseApiDataOptions,
): UseHighlightsResult {
  const override = useHookOverride('useHighlights');
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();
  const userScope = useUserScope();

  const highlightsClient = useMemo(() => new HighlightsClient(apiClient), [apiClient]);

  // The `queryKey` uses `options.version_id` and `options.passage_id`.
  // The `queryKey` does not use the `options` object.
  // Callers often pass a new `{ version_id, passage_id }` on each render.
  // A new object does not start a new fetch.
  // If `GetHighlightsOptions` gets a new field that changes the result, that field must go in the `queryKey` too.
  //
  // A `null` `userScope` means the account is not known: auth is still loading,
  // the signed-in user has no id, or an access token is set while no user is
  // identified (the token's account is a mystery). Highlights belong to one
  // account, so this hook does not fetch until the scope is known. Two
  // unidentified accounts would otherwise write to the same cache entry.
  // `null` goes into the key as-is: the query is disabled for that render, so
  // the key is never fetched, and a sentinel string would only suggest the
  // entry is real.
  const { data, loading, error, refetch } = useApiData<Collection<Highlight>>(
    [...keyBase, 'highlights', userScope, options.version_id, options.passage_id],
    () => highlightsClient.getHighlights(options),
    {
      enabled: userScope !== null && !override && apiOptions?.enabled !== false,
      // The `queryKey` carries the user scope. Holding previous data across a
      // key change would show one account's highlights to another during an
      // account switch, so this hook always drops to `null` instead.
      keepPreviousData: false,
    },
  );

  // NOTE: these mutations intentionally do NOT auto-refetch. A single logical
  // apply/remove can fan out into several writes (one per contiguous run for
  // apply, one per verse for delete); auto-refetching per call would issue a
  // GET per write. Callers coalesce instead — issue the batch, then `refetch()`
  // once after it settles. The seam hook (`useBibleReaderHighlights`) is the
  // sole consumer and does exactly that.
  const createHighlight = useCallback(
    (data: CreateHighlight): Promise<Highlight> => highlightsClient.createHighlight(data),
    [highlightsClient],
  );

  const deleteHighlight = useCallback(
    (passageId: string, deleteOptions: DeleteHighlightOptions): Promise<void> =>
      highlightsClient.deleteHighlight(passageId, deleteOptions),
    [highlightsClient],
  );

  if (override) return override(options, apiOptions);
  return {
    highlights: data,
    loading,
    error,
    refetch,
    createHighlight,
    deleteHighlight,
  };
}
