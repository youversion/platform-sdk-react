'use client';

import { useMemo, useCallback } from 'react';
import { useContext } from 'react';
import { YouVersionContext } from './context';
import { HighlightsClient, ApiClient } from '@youversion/platform-core';
import { useApiData, type UseApiDataOptions } from './useApiData';
import {
  type GetHighlightsOptions,
  type DeleteHighlightOptions,
  type CreateHighlight,
  type Collection,
  type Highlight,
} from '@youversion/platform-core';

export function useHighlights(
  options: GetHighlightsOptions,
  apiOptions?: UseApiDataOptions,
): {
  highlights: Collection<Highlight> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  createHighlight: (data: CreateHighlight) => Promise<Highlight>;
  deleteHighlight: (passageId: string, deleteOptions: DeleteHighlightOptions) => Promise<void>;
  getRecentColors: () => Promise<string[]>;
} {
  const context = useContext(YouVersionContext);

  const highlightsClient = useMemo(() => {
    if (!context?.appKey) {
      throw new Error(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    }
    return new HighlightsClient(
      new ApiClient({
        appKey: context.appKey,
        apiHost: context.apiHost,
        installationId: context.installationId,
        additionalHeaders: context.additionalHeaders,
      }),
    );
  }, [context?.apiHost, context?.appKey, context?.installationId, context?.additionalHeaders]);

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

  const getRecentColors = useCallback(
    (): Promise<string[]> => highlightsClient.getRecentColors(),
    [highlightsClient],
  );

  return {
    highlights: data,
    loading,
    error,
    refetch,
    createHighlight,
    deleteHighlight,
    getRecentColors,
  };
}
