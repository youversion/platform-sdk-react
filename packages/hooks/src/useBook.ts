'use client';

import { useContext } from 'react';
import { getBook, type BibleBook } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseBookResult = UseNamedQueryResult<'book', BibleBook>;

export function useBook(
  versionId: number,
  book: string,
  options?: UseApiDataOptions,
): UseBookResult {
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<BibleBook>(
    [...keyBase, 'book', versionId, book],
    () =>
      bibleClient ? bibleClient.getBook(versionId, book) : getBook(apiClient, versionId, book),
    {
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { book: data, loading, error, refetch };
}
