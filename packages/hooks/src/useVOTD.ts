'use client';

import type { VOTD } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { UseQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseVerseOfTheDayResult = UseQueryResult<VOTD>;

export function useVerseOfTheDay(day: number, options?: UseApiDataOptions): UseVerseOfTheDayResult {
  const override = useHookOverride('useVerseOfTheDay');
  if (override) return override(day, options);

  const bibleClient = useBibleClient();

  const { data, loading, error, refetch } = useApiData<VOTD>(
    () => bibleClient.getVOTD(day),
    [bibleClient, day],
    { enabled: options?.enabled !== false },
  );
  return { data, loading, error, refetch };
}
