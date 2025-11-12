'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { BibleVersion } from '@youversion/platform-core';

export function useVersion(
  versionId: number,
  options?: UseApiDataOptions,
): {
  version: BibleVersion | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const bibleClient = useBibleClient();

  const {
    data: version,
    loading,
    error,
    refetch,
  } = useApiData<BibleVersion>(() => bibleClient.getVersion(versionId), [bibleClient, versionId], {
    enabled: options?.enabled !== false,
  });

  return { version, loading, error, refetch };
}
