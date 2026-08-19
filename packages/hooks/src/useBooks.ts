'use client';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleBook, Collection } from '@youversion/platform-core';
import { useHookOverride } from './useHookOverride';

export type UseBooksResult = UseNamedQueryResult<'books', Collection<BibleBook>>;

export function useBooks(versionId: number, options?: UseApiDataOptions): UseBooksResult {
  const override = useHookOverride('useBooks');
  if (override) return override(versionId, options);

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
