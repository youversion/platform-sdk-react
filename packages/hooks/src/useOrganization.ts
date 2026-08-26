'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { type Organization } from '@youversion/platform-core';
import { useOrganizationsClient } from './useOrganizationsClient';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseOrganizationResult = UseNamedQueryResult<'organization', Organization>;

export function useOrganization(
  organizationId: string,
  apiOptions?: UseApiDataOptions,
): UseOrganizationResult {
  const organizationsClient = useOrganizationsClient();
  const keyBase = useQueryKeyBase();
  const enabled = apiOptions?.enabled !== false && organizationId.trim().length > 0;

  const { data, loading, error, refetch } = useApiData<Organization>(
    [...keyBase, 'organization', organizationId],
    () => organizationsClient.getOrganization(organizationId),
    {
      enabled,
      keepPreviousData: apiOptions?.keepPreviousData,
    },
  );

  return {
    organization: data,
    loading,
    error,
    refetch,
  };
}
