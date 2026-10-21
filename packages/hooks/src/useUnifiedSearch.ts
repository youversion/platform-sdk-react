'use client';

import {
  clampSearchText,
  parseSearchLanguageRange,
  type SearchUnifiedField,
  type SearchUnifiedResponse,
} from '@youversion/platform-core';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useHookOverride } from './useHookOverride';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { useSearchClient } from './useSearchClient';
import type { UseQueryResult } from './useQueryResult';

export type UseUnifiedSearchProps = Readonly<{
  /** Search text (1–100 graphemes after trim). */
  query: string;
  /** Bible version id (sent to the API as `bible_id`). */
  versionId: number;
  /** Ordered language ranges (`en_US` is normalized to `en-us` on the wire). */
  languageRanges: string | readonly string[];
  /** Known user-intent hint; omit for the service default (`unknown`). */
  userIntent?: 'unknown' | 'topical' | 'text' | 'reference';
  /** Result kinds to request; omit for both `verses` and `topics`. Must not be empty. */
  fields?: readonly SearchUnifiedField[];
}>;

export type UseUnifiedSearchResult = UseQueryResult<SearchUnifiedResponse>;

function isUnifiedSearchInputReady(
  query: string,
  languageRanges: string | readonly string[],
  fields: readonly SearchUnifiedField[] | undefined,
): boolean {
  const trimmed = query.trim();
  if (trimmed.length === 0 || clampSearchText(trimmed) !== trimmed) {
    return false;
  }
  const rangeArray = Array.isArray(languageRanges) ? languageRanges : [languageRanges];
  if (rangeArray.length === 0) {
    return false;
  }
  try {
    for (const range of rangeArray) {
      parseSearchLanguageRange(range);
    }
  } catch {
    return false;
  }
  if (fields !== undefined && fields.length === 0) {
    return false;
  }
  return true;
}

/**
 * Reads one unpaginated snapshot of top verses and topics.
 * Does not load suggestions or debounce.
 * Omit `fields` for all kinds, or provide a nonempty selection.
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
  const inputReady = isUnifiedSearchInputReady(query, languageRanges, fields);
  const result = useApiData(
    [...keyBase, 'searchUnified', query, versionId, languageRanges, userIntent, fields],
    () => client.searchUnified(query, versionId, languageRanges, { userIntent, fields }),
    {
      enabled: !override && inputReady && apiOptions?.enabled !== false,
      keepPreviousData: apiOptions?.keepPreviousData,
    },
  );

  if (override) return override(props, apiOptions);
  return result;
}
