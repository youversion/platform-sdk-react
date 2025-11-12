'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BibleChapter, Collection } from '@youversion/platform-core';

export function useChapters(
  versionId: number,
  book: string,
  options?: UseApiDataOptions,
): {
  chapters: Collection<BibleChapter> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  // Don't attempt to fetch if book is invalid
  const isValidBook = Boolean(book) && book !== 'undefined' && book !== 'null';

  const {
    data: chapters,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleChapter>>(
    () => bibleClient.getChapters(versionId, book),
    [bibleClient, versionId, book],
    {
      enabled: options?.enabled !== false && isValidBook,
    },
  );

  return { chapters, loading, error, refetch };
}
