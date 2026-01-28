'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import {
  type GetLanguagesOptions,
  type Collection,
  type Language,
} from '@youversion/platform-core';
import { useLanguagesClient } from './useLanguageClient';

export function useLanguages(
  options: GetLanguagesOptions = {},
  apiOptions?: UseApiDataOptions,
): {
  languages: Collection<Language> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const languagesClient = useLanguagesClient();

  const { data, loading, error, refetch } = useApiData<Collection<Language>>(
    () => languagesClient.getLanguages(options),
    [
      languagesClient,
      JSON.stringify(options['fields[]']),
      options?.country,
      options?.page_size,
      options?.page_token,
    ],
    {
      enabled: apiOptions?.enabled !== false,
    },
  );

  return {
    languages: data,
    loading,
    error,
    refetch,
  };
}
