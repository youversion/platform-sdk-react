'use client';

import { useContext } from 'react';
import { getVerse, type BibleVerse } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseVerseResult = UseNamedQueryResult<'verse', BibleVerse>;

export function useVerse(
  versionId: number,
  book: string,
  chapter: number,
  verse: number,
  options?: UseApiDataOptions,
): UseVerseResult {
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const {
    data: verseData,
    loading,
    error,
    refetch,
  } = useApiData<BibleVerse>(
    [...keyBase, 'verse', versionId, book, chapter, verse],
    () =>
      bibleClient
        ? bibleClient.getVerse(versionId, book, chapter, verse)
        : getVerse(apiClient, versionId, book, chapter, verse),
    {
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { verse: verseData, loading, error, refetch };
}
