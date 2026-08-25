'use client';

import type { VOTD } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseVerseOfTheDayResult = UseQueryResult<VOTD>;

export function useVerseOfTheDay(day: number, options?: UseApiDataOptions): UseVerseOfTheDayResult {
  const override = useHookOverride('useVerseOfTheDay');
  const bibleClient = useBibleClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<VOTD>(
    [...keyBase, 'votd', day],
    () => bibleClient.getVOTD(day),
    { enabled: !override && options?.enabled !== false },
  );
  if (override) return override(day, options);
  return { data, loading, error, refetch };
}
