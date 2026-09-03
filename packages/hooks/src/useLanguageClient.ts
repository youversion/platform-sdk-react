'use client';

import { useContext, useMemo } from 'react';
import { LanguagesClient } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';

export function useLanguagesClient(): LanguagesClient {
  const override = useContext(YouVersionContext)?.languagesClient;
  const apiClient = useApiClient();
  const constructed = useMemo(() => new LanguagesClient(apiClient), [apiClient]);
  return override ?? constructed;
}
