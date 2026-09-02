'use client';

import { useContext } from 'react';
import { getVerses, type BibleVerse, type Collection } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseVersesResult = UseNamedQueryResult<'verses', Collection<BibleVerse>>;

export function useVerses(
  versionId: number,
  book: string,
  chapter: number,
  options?: UseApiDataOptions,
): UseVersesResult {
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const {
    data: verses,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleVerse>>(
    [...keyBase, 'verses', versionId, book, chapter],
    () =>
      bibleClient
        ? bibleClient.getVerses(versionId, book, chapter)
        : getVerses(apiClient, versionId, book, chapter),
    {
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { verses, loading, error, refetch };
}
