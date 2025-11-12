'use client';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BibleBook, Collection } from '@youversion/platform-core';

export function useBooks(
  versionId: number,
  options?: UseApiDataOptions,
): {
  books: Collection<BibleBook> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  const {
    data: books,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleBook>>(
    () => bibleClient.getBooks(versionId),
    [bibleClient, versionId],
    {
      enabled: options?.enabled !== false,
    },
  );

  return { books, loading, error, refetch };
}
