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

  const { data, loading, error, refetch } = useApiData<Collection<Highlight>>(
    () => highlightsClient.getHighlights(options),
    [highlightsClient, options.version_id, options.passage_id],
    {
      enabled: apiOptions?.enabled !== false,
    },
  );

  const createHighlight = useCallback(
    async (data: CreateHighlight): Promise<Highlight> => {
      const result = await highlightsClient.createHighlight(data);
      refetch();
      return result;
    },
    [highlightsClient, refetch],
  );

  const deleteHighlight = useCallback(
    async (passageId: string, deleteOptions: DeleteHighlightOptions): Promise<void> => {
      await highlightsClient.deleteHighlight(passageId, deleteOptions);
      refetch();
    },
    [highlightsClient, refetch],
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
