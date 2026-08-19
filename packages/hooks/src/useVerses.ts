'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleVerse, Collection } from '@youversion/platform-core';

export type UseVersesResult = UseNamedQueryResult<'verses', Collection<BibleVerse>>;

export function useVerses(
  versionId: number,
  book: string,
  chapter: number,
  options?: UseApiDataOptions,
): UseVersesResult {
  const bibleClient = useBibleClient();

  const {
    data: verses,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleVerse>>(
    () => bibleClient.getVerses(versionId, book, chapter),
    [bibleClient, versionId, book, chapter],
    {
      enabled: options?.enabled !== false,
    },
  );

  return { verses, loading, error, refetch };
}
