'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { type Language } from '@youversion/platform-core';
import { useLanguagesClient } from './useLanguageClient';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseLanguageResult = UseNamedQueryResult<'language', Language>;

export function useLanguage(languageId: string, apiOptions?: UseApiDataOptions): UseLanguageResult {
  const override = useHookOverride('useLanguage');
  const languagesClient = useLanguagesClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<Language>(
    [...keyBase, 'language', languageId],
    () => languagesClient.getLanguage(languageId),
    {
      enabled: !override && apiOptions?.enabled !== false,
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
