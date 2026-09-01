'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleChapter, Collection } from '@youversion/platform-core';

export type UseChaptersResult = UseNamedQueryResult<'chapters', Collection<BibleChapter>>;

export function useChapters(
  versionId: number,
  book: string,
  options?: UseApiDataOptions,
): UseChaptersResult {
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  // Don't attempt to fetch if book is invalid
  const isValidBook = Boolean(book) && book !== 'undefined' && book !== 'null';

  const {
    data: chapters,
    loading,
    error,
    refetch,
  } = useApiData(
    [...keyBase, 'chapters', versionId, book],
    () => bibleClient.readWithPolicy({ resource: 'chapters', versionId, book }),
    {
      cacheControl: true,
      enabled: options?.enabled !== false && isValidBook,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { chapters, loading, error, refetch };
}
