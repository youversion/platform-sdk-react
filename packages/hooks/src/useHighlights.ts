'use client';

import { useMemo, useCallback } from 'react';
import { HighlightsClient } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';
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
  if (override) return override(options, apiOptions);

  const apiClient = useApiClient();

  const highlightsClient = useMemo(() => new HighlightsClient(apiClient), [apiClient]);

  // The dep array keys on the primitive fields of `options` rather than the
  // object reference, so an inline `{ version_id, passage_id }` literal doesn't
  // force a refetch on every render. If `GetHighlightsOptions` gains more
  // fields that should trigger refetches, add them to this array too.
  const { data, loading, error, refetch } = useApiData<Collection<Highlight>>(
    () => highlightsClient.getHighlights(options),
    [highlightsClient, options.version_id, options.passage_id],
    {
      enabled: apiOptions?.enabled !== false,
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

  return {
    highlights: data,
    loading,
    error,
    refetch,
    createHighlight,
    deleteHighlight,
  };
}
