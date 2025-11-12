'use client';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BibleChapter } from '@youversion/platform-core';

export function useChapter(
  versionId: number,
  book: string,
  chapter: number,
  options?: UseApiDataOptions,
): {
  chapter: BibleChapter | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  const {
    data: chapterData,
    loading,
    error,
    refetch,
  } = useApiData<BibleChapter>(
    () => bibleClient.getChapter(versionId, book, chapter),
    [bibleClient, versionId, book, chapter],
    {
      enabled: options?.enabled !== false,
    },
  );

  return { chapter: chapterData, loading, error, refetch };
}
