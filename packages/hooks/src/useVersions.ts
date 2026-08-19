'use client';

import { useBibleClient } from './useBibleClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import type { UseNamedQueryResult } from './useQueryResult';
import type { Collection, BibleVersion } from '@youversion/platform-core';
import { useHookOverride } from './useHookOverride';

export interface UseVersionsOptions extends UseApiDataOptions {
  /** Maximum number of results per page, or '*' for all (requires 1-3 fields) */
  page_size?: number | '*';
  /** Token for pagination */
  page_token?: string;
  /** Specific fields to return (required when page_size is '*', must be 1-3 fields) */
  fields?: (keyof BibleVersion)[];
  /** Include all available versions regardless of license */
  all_available?: boolean;
}

export type UseVersionsResult = UseNamedQueryResult<'versions', Collection<BibleVersion>>;

export function useVersions(
  languageRanges: string | string[] = 'en',
  licenseId?: string | number,
  options?: UseVersionsOptions,
): UseVersionsResult {
  const override = useHookOverride('useVersions');
  const bibleClient = useBibleClient();

  const getVersionsOptions =
    options?.page_size !== undefined ||
    options?.page_token !== undefined ||
    options?.fields !== undefined ||
    options?.all_available !== undefined
      ? {
          page_size: options?.page_size,
          page_token: options?.page_token,
          fields: options?.fields,
          all_available: options?.all_available,
        }
      : undefined;

  // Create stable keys for arrays to avoid unnecessary refetches
  const languageRangesKey = Array.isArray(languageRanges)
    ? languageRanges.join(',')
    : languageRanges;
  const fieldsKey = options?.fields?.join(',');

  const {
    data: versions,
    loading,
    error,
    refetch,
  } = useApiData<Collection<BibleVersion>>(
    () => bibleClient.getVersions(languageRanges, licenseId, getVersionsOptions),
    [
      bibleClient,
      languageRangesKey,
      licenseId,
      options?.page_size,
      options?.page_token,
      fieldsKey,
      options?.all_available,
    ],
    {
      enabled: !override && options?.enabled !== false,
    },
  );

  if (override) return override(languageRanges, licenseId, options);
  return { versions, loading, error, refetch };
}
