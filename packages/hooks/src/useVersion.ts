'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleVersion } from '@youversion/platform-core';
import { useHookOverride } from './useHookOverride';

export type UseVersionResult = UseNamedQueryResult<'version', BibleVersion>;

export function useVersion(versionId: number, options?: UseApiDataOptions): UseVersionResult {
  const override = useHookOverride('useVersion');
  const bibleClient = useBibleClient();

  const {
    data: version,
    loading,
    error,
    refetch,
  } = useApiData<BibleVersion>(() => bibleClient.getVersion(versionId), [bibleClient, versionId], {
    enabled: !override && options?.enabled !== false,
  });

  if (override) return override(versionId, options);
  return { version, loading, error, refetch };
}
