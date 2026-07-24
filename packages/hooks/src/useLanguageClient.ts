'use client';

import { useMemo } from 'react';
import { LanguagesClient } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';

export function useLanguagesClient(): LanguagesClient {
  const apiClient = useApiClient();
  return useMemo(() => new LanguagesClient(apiClient), [apiClient]);
}
