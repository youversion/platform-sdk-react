'use client';

import type { SearchUnifiedOptions, SearchUnifiedResponse } from '@youversion/platform-core';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useHookOverride } from './useHookOverride';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { useSearchClient } from './useSearchClient';
import type { UseQueryResult } from './useQueryResult';

export type UseUnifiedSearchProps = Readonly<
  SearchUnifiedOptions & {
    query: string;
    versionId: number;
    languageRanges: string | string[];
  }
>;

export type UseUnifiedSearchResult = UseQueryResult<SearchUnifiedResponse>;

/**
 * Reads one unpaginated snapshot of top verses and topics, without suggestions or
 * automatic submission/debouncing. Pass `enabled: false` until the query is ready.
 * `useBibleSearch` remains the separate, paginated verse-search flow.
 */
export function useUnifiedSearch(
  props: UseUnifiedSearchProps,
  apiOptions?: UseApiDataOptions,
): UseUnifiedSearchResult {
  const override = useHookOverride('useUnifiedSearch');
  const client = useSearchClient();
  const keyBase = useQueryKeyBase();
  const { query, versionId, languageRanges, userIntent, fields } = props;
  const result = useApiData(
    [...keyBase, 'searchUnified', query, versionId, languageRanges, userIntent, fields],
    () => client.searchUnified(query, versionId, languageRanges, { userIntent, fields }),
    {
      enabled: !override && apiOptions?.enabled !== false,
      keepPreviousData: apiOptions?.keepPreviousData,
    },
  );

  if (override) return override(props, apiOptions);
  return result;
}
