'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { Collection, BibleVersion } from '@youversion/platform-core';

export function useVersions(
  languageRanges: string = 'en',
  licenseId?: string | number,
  options?: UseApiDataOptions,
): {
  versions: Collection<BibleVersion> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  const {
    data: versions,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleVersion>>(
    () => bibleClient.getVersions(languageRanges, licenseId),
    [bibleClient, languageRanges, licenseId],
    {
      enabled: options?.enabled !== false,
    },
  );

  return { versions, loading, error, refetch };
}
