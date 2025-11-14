'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import { useSearchClient } from './useSearchClient';
import type { SearchResponse } from '@youversion/platform-core';

/**
 * React hook that executes a full-text search request against the YouVersion
 * Search API and returns the associated loading & error state.
 *
 * The hook will throw if it is used outside of a `BibleSDKProvider` because it
 * needs an `appKey` from context to construct the underlying {@link ApiClient}.
 *
 * Results are automatically re-fetched when the `query` or `versionId`
 * arguments change. Fetching can be disabled via `options.enabled`.
 *
 * @param query      Search phrase supplied by the user.
 * @param versionId  Bible version to scope results to (e.g. `111`).
 * @param options    Optional configuration such as `enabled`.
 */
export function useSearch(
  query: string,
  versionId: number,
  options?: UseApiDataOptions,
): {
  results: SearchResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const searchClient = useSearchClient();

  const {
    data: results,
    loading,
    error,
    refetch,
  } = useApiData<SearchResponse>(
    () => searchClient.search(query, versionId),
    [searchClient, query, versionId],
    {
      enabled: options?.enabled !== false && query.trim().length > 0,
    },
  );

  return { results, loading, error, refetch } as const;
}
