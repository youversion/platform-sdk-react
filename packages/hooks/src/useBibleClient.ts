'use client';

import { useContext, useMemo } from 'react';
import { BibleClient } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import { useApiClient } from './internal/useApiClient';

export function useBibleClient(): BibleClient {
  const override = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const constructed = useMemo(() => new BibleClient(apiClient), [apiClient]);
  return override ?? constructed;
}
