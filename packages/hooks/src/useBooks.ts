'use client';
import { useContext } from 'react';
import { getBooks, type BibleBook, type Collection } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseBooksResult = UseNamedQueryResult<'books', Collection<BibleBook>>;

export function useBooks(versionId: number, options?: UseApiDataOptions): UseBooksResult {
  const override = useHookOverride('useBooks');
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const {
    data: books,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleBook>>(
    [...keyBase, 'books', versionId],
    () => (bibleClient ? bibleClient.getBooks(versionId) : getBooks(apiClient, versionId)),
    {
      enabled: !override && options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  if (override) return override(versionId, options);
  return { books, loading, error, refetch };
}
