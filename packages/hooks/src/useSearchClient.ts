'use client';

import { useContext, useMemo } from 'react';
import { SearchClient } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import { useApiClient } from './internal/useApiClient';

/** Mirrors `useBibleClient`. `YouVersionContext.searchClient` wins in tests. */
export function useSearchClient(): SearchClient {
  const override = useContext(YouVersionContext)?.searchClient;
  const apiClient = useApiClient();
  const constructed = useMemo(() => new SearchClient(apiClient), [apiClient]);
  return override ?? constructed;
}
