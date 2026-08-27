'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import type { BibleVersion } from '@youversion/platform-core';
import { useHookOverride } from './useHookOverride';

export type UseVersionResult = UseNamedQueryResult<'version', BibleVersion>;

export function useVersion(versionId: number, options?: UseApiDataOptions): UseVersionResult {
  const override = useHookOverride('useVersion');
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  const {
    data: version,
    loading,
    error,
    refetch,
  } = useApiData<BibleVersion>(
    [...keyBase, 'version', versionId],
    () => bibleClient.getVersion(versionId),
    {
      enabled: !override && options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  if (override) return override(versionId, options);
  return { version, loading, error, refetch };
}
