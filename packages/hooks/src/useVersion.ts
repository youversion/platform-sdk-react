'use client';

import { useContext } from 'react';
import { getVersion, type BibleVersion } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseVersionResult = UseNamedQueryResult<'version', BibleVersion>;

export function useVersion(versionId: number, options?: UseApiDataOptions): UseVersionResult {
  const override = useHookOverride('useVersion');
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const {
    data: version,
    loading,
    error,
    refetch,
  } = useApiData<BibleVersion>(
    [...keyBase, 'version', versionId],
    () => (bibleClient ? bibleClient.getVersion(versionId) : getVersion(apiClient, versionId)),
    {
      enabled: !override && options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  if (override) return override(versionId, options);
  return { version, loading, error, refetch };
}
