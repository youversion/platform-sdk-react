'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import {
  type GetLanguagesOptions,
  type Collection,
  type Language,
} from '@youversion/platform-core';
import { useLanguagesClient } from './useLanguageClient';
import type { UseNamedQueryResult } from './useQueryResult';
import { useHookOverride } from './useHookOverride';

export type UseLanguagesResult = UseNamedQueryResult<'languages', Collection<Language>>;

export function useLanguages(
  options: GetLanguagesOptions = {},
  apiOptions?: UseApiDataOptions,
): UseLanguagesResult {
  const override = useHookOverride('useLanguages');
  const languagesClient = useLanguagesClient();

  const { data, loading, error, refetch } = useApiData<Collection<Language>>(
    () => languagesClient.getLanguages(options),
    [
      languagesClient,
      JSON.stringify(options.fields),
      options?.country,
      options?.page_size,
      options?.page_token,
    ],
    {
      enabled: !override && apiOptions?.enabled !== false,
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
