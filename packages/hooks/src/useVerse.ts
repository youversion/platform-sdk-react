'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BibleVerse } from '@youversion/platform-core';

export function useVerse(
  versionId: number,
  book: string,
  chapter: number,
  verse: number,
  options?: UseApiDataOptions,
): {
  verse: BibleVerse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  const {
    data: verseData,
    loading,
    error,
    refetch,
  } = useApiData<BibleVerse>(
    () => bibleClient.getVerse(versionId, book, chapter, verse),
    [bibleClient, versionId, book, chapter, verse],
    {
      enabled: options?.enabled !== false,
    },
  );

  return { verse: verseData, loading, error, refetch };
}
