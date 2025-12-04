'use client';

import { useMemo } from 'react';
import { useContext } from 'react';
import { YouVersionContext } from './context';
import { LanguagesClient, ApiClient } from '@youversion/platform-core';
import { useApiData, type UseApiDataOptions } from './useApiData';
import {
  type GetLanguagesOptions,
  type Collection,
  type Language,
} from '@youversion/platform-core';

export function useLanguages(
  options: GetLanguagesOptions,
  apiOptions?: UseApiDataOptions,
): {
  languages: Collection<Language> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const context = useContext(YouVersionContext);

  const languagesClient = useMemo(() => {
    if (!context?.appKey) {
      throw new Error(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    }
    return new LanguagesClient(
      new ApiClient({
        appKey: context.appKey,
        apiHost: context.apiHost,
        installationId: context.installationId,
      }),
    );
  }, [context?.apiHost, context?.appKey, context?.installationId]);

  const { data, loading, error, refetch } = useApiData<Collection<Language>>(
    () => languagesClient.getLanguages(options),
    [languagesClient, options?.country, options?.page_size, options?.page_token],
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
