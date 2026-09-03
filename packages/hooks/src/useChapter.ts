'use client';
import { useContext } from 'react';
import { getChapter, type BibleChapter } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseChapterResult = UseNamedQueryResult<'chapter', BibleChapter>;

export function useChapter(
  versionId: number,
  book: string,
  chapter: number,
  options?: UseApiDataOptions,
): UseChapterResult {
  const override = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const {
    data: chapterData,
    loading,
    error,
    refetch,
  } = useApiData<BibleChapter>(
    [...keyBase, 'chapter', versionId, book, chapter],
    () =>
      override
        ? override.getChapter(versionId, book, chapter)
        : getChapter(apiClient, versionId, book, chapter),
    {
      enabled: options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  return { chapter: chapterData, loading, error, refetch };
}
