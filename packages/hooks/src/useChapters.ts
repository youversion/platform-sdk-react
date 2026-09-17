'use client';

import { useContext } from 'react';
import { getChapters, type BibleChapter, type Collection } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseChaptersResult = UseNamedQueryResult<'chapters', Collection<BibleChapter>>;

export function useChapters(
  versionId: number,
  book: string,
  options?: UseApiDataOptions,
): UseChaptersResult {
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  // Don't attempt to fetch if book is invalid
  const isValidBook = Boolean(book) && book !== 'undefined' && book !== 'null';

  const {
    data: chapters,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleChapter>>(
    [...keyBase, 'chapters', versionId, book],
    () =>
      bibleClient
        ? bibleClient.getChapters(versionId, book)
        : getChapters(apiClient, versionId, book),
    {
      enabled: options?.enabled !== false && isValidBook,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { chapters, loading, error, refetch };
}
