'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import { type Language } from '@youversion/platform-core';
import { useLanguagesClient } from './useLanguageClient';

export function useLanguage(
  languageId: string,
  apiOptions?: UseApiDataOptions,
): {
  language: Language | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const languagesClient = useLanguagesClient();

  const { data, loading, error, refetch } = useApiData<Language>(
    () => languagesClient.getLanguage(languageId),
    [languagesClient, languageId],
    {
      enabled: apiOptions?.enabled !== false,
    },
  );

  return {
    language: data,
    loading,
    error,
    refetch,
  };
}
