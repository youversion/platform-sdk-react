'use client';

import type { VOTD } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';

export function useVerseOfTheDay(
  day: number,
  options?: UseApiDataOptions,
): { data: VOTD | null; loading: boolean; error: Error | null; refetch: () => void } {
  const bibleClient = useBibleClient();

  const { data, loading, error, refetch } = useApiData<VOTD>(
    () => bibleClient.getVOTD(day),
    [bibleClient, day],
    { enabled: options?.enabled !== false },
  );
  return { data, loading, error, refetch };
}
