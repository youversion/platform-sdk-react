'use client';

import { useContext } from 'react';
import { getVersions, type Collection, type BibleVersion } from '@youversion/platform-core';
import { YouVersionContext } from './context/YouVersionContext';
import { useApiClient } from './internal/useApiClient';
import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import type { UseNamedQueryResult } from './useQueryResult';
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
  const bibleClient = useContext(YouVersionContext)?.bibleClient;
  const apiClient = useApiClient();
  const keyBase = useQueryKeyBase();

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
    [
      ...keyBase,
      'versions',
      languageRangesKey,
      licenseId,
      options?.page_size,
      options?.page_token,
      fieldsKey,
      options?.all_available,
    ],
    () =>
      bibleClient
        ? bibleClient.getVersions(languageRanges, licenseId, getVersionsOptions)
        : getVersions(apiClient, languageRanges, licenseId, getVersionsOptions),
    {
      enabled: !override && options?.enabled !== false,
      keepPreviousData: options?.keepPreviousData,
    },
  );

  if (override) return override(languageRanges, licenseId, options);
  return { versions, loading, error, refetch };
}
