'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleBook } from '@youversion/platform-core';

export type UseBookResult = UseNamedQueryResult<'book', BibleBook>;

export function useBook(
  versionId: number,
  book: string,
  options?: UseApiDataOptions,
): UseBookResult {
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<BibleBook>(
    [...keyBase, 'book', versionId, book],
    () => bibleClient.getBookWithPolicy(versionId, book),
    {
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { book: data, loading, error, refetch };
}
