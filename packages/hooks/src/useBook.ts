'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleBook } from '@youversion/platform-core';

export type UseBookResult = UseNamedQueryResult<'book', BibleBook>;

export function useBook(
  versionId: number,
  book: string,
  options?: UseApiDataOptions,
): UseBookResult {
  const bibleClient = useBibleClient();

  const { data, loading, error, refetch } = useApiData<BibleBook>(
    () => bibleClient.getBook(versionId, book),
    [bibleClient, versionId, book],
    {
      enabled: options?.enabled !== false,
    },
  );

  return { book: data, loading, error, refetch };
}
