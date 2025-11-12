'use client';

import { useMemo } from 'react';
import { useContext } from 'react';
import { BibleSDKContext } from './context';
import {
  LanguagesClient,
  ApiClient,
  YouVersionPlatformConfiguration,
} from '@youversion/platform-core';
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
  const context = useContext(BibleSDKContext);

  const languagesClient = useMemo(() => {
    if (!context?.appId) {
      throw new Error(
        'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
      );
    }
    return new LanguagesClient(
      new ApiClient({
        appId: context.appId,
        installationId: YouVersionPlatformConfiguration.installationId,
      }),
    );
  }, [context?.appId]);

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
