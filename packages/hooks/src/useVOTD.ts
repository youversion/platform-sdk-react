'use client';

import { useContext } from 'react';
import { getVOTD, type VOTD } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseVerseOfTheDayResult = UseQueryResult<VOTD>;

export function useVerseOfTheDay(day: number, options?: UseApiDataOptions): UseVerseOfTheDayResult {
  const override = useHookOverride('useVerseOfTheDay');
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<VOTD>(
    [...keyBase, 'votd', day],
    () => (bibleClient ? bibleClient.getVOTD(day) : getVOTD(apiClient, day)),
    {
      enabled: !override && options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );
  if (override) return override(day, options);
  return { data, loading, error, refetch };
}
