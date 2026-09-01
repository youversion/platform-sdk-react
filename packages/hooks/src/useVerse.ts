'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleVerse } from '@youversion/platform-core';

export type UseVerseResult = UseNamedQueryResult<'verse', BibleVerse>;

export function useVerse(
  versionId: number,
  book: string,
  chapter: number,
  verse: number,
  options?: UseApiDataOptions,
): UseVerseResult {
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  const {
    data: verseData,
    loading,
    error,
    refetch,
  } = useApiData(
    [...keyBase, 'verse', versionId, book, chapter, verse],
    () => bibleClient.readWithPolicy({ resource: 'verse', versionId, book, chapter, verse }),
    {
      cacheControl: true,
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { verse: verseData, loading, error, refetch };
}
