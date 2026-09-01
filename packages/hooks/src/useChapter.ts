'use client';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleChapter } from '@youversion/platform-core';

export type UseChapterResult = UseNamedQueryResult<'chapter', BibleChapter>;

export function useChapter(
  versionId: number,
  book: string,
  chapter: number,
  options?: UseApiDataOptions,
): UseChapterResult {
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  const {
    data: chapterData,
    loading,
    error,
    refetch,
  } = useApiData(
    [...keyBase, 'chapter', versionId, book, chapter],
    () => bibleClient.readWithPolicy({ resource: 'chapter', versionId, book, chapter }),
    {
      cacheControl: true,
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { chapter: chapterData, loading, error, refetch };
}
