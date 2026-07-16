'use client';

import { useMemo } from 'react';
import { BibleClient } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';

export function useBibleClient(): BibleClient {
  const apiClient = useApiClient();
  return useMemo(() => new BibleClient(apiClient), [apiClient]);
}
