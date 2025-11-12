'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BiblePassage } from '@youversion/platform-core';

export function usePassage(
  versionId: number,
  usfm: string,
  format: 'html' | 'text' = 'html',
  options?: UseApiDataOptions,
): {
  passage: BiblePassage | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  // Don't attempt to fetch if usfm is invalid
  const isValidUsfm = Boolean(usfm) && usfm !== 'undefined' && usfm !== 'null';

  const { data, loading, error, refetch } = useApiData<BiblePassage>(
    () => bibleClient.getPassage(versionId, usfm, format),
    [bibleClient, versionId, usfm, format],
    { enabled: options?.enabled !== false && isValidUsfm },
  );

  return { passage: data, loading, error, refetch };
}
