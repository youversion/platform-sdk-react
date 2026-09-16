'use client';

import { useContext } from 'react';
import {
  getLanguages,
  type GetLanguagesOptions,
  type Collection,
  type Language,
} from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseLanguagesResult = UseNamedQueryResult<'languages', Collection<Language>>;

export function useLanguages(
  options: GetLanguagesOptions = {},
  apiOptions?: UseApiDataOptions,
): UseLanguagesResult {
  const override = useHookOverride('useLanguages');
  const languagesClient = useContext(YouVersionContext)?.languagesClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

  const { data, loading, error, refetch } = useApiData<Collection<Language>>(
    [
      ...keyBase,
      'languages',
      JSON.stringify(options.fields),
      options?.country,
      options?.page_size,
      options?.page_token,
    ],
    () =>
      languagesClient ? languagesClient.getLanguages(options) : getLanguages(apiClient, options),
    {
      enabled: !override && apiOptions?.enabled !== false,
      keepPreviousData: apiOptions?.keepPreviousData,
    },
  );

  if (override) return override(options, apiOptions);
  return {
    languages: data,
    loading,
    error,
    refetch,
  };
}
