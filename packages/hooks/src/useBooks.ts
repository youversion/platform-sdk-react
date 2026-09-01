'use client';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleBook, Collection } from '@youversion/platform-core';
import { useHookOverride } from './useHookOverride';

export type UseBooksResult = UseNamedQueryResult<'books', Collection<BibleBook>>;

export function useBooks(versionId: number, options?: UseApiDataOptions): UseBooksResult {
  const override = useHookOverride('useBooks');
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  const {
    data: books,
    loading,
    error,
    refetch,
  } = useApiData(
    [...keyBase, 'books', versionId],
    () => bibleClient.readWithPolicy({ resource: 'books', versionId }),
    {
      cacheControl: true,
      enabled: !override && options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  if (override) return override(versionId, options);
  return { books, loading, error, refetch };
}
