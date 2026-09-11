'use client';

import { useContext } from 'react';
import { getLanguage, type Language } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseLanguageResult = UseNamedQueryResult<'language', Language>;

export function useLanguage(languageId: string, apiOptions?: UseApiDataOptions): UseLanguageResult {
  const override = useHookOverride('useLanguage');
  const languagesClient = useContext(YouVersionContext)?.languagesClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<Language>(
    [...keyBase, 'language', languageId],
    () =>
      languagesClient
        ? languagesClient.getLanguage(languageId)
        : getLanguage(apiClient, languageId),
    {
      enabled: !override && apiOptions?.enabled !== false,
      keepPreviousData: apiOptions?.keepPreviousData,
    },
  );

  if (override) return override(languageId, apiOptions);
  return {
    language: data,
    loading,
    error,
    refetch,
  };
}
