'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import { type Organization } from '@youversion/platform-core';
import { useOrganizationsClient } from './useOrganizationsClient';
import type { UseNamedQueryResult } from './useQueryResult';

export type UseOrganizationResult = UseNamedQueryResult<'organization', Organization>;

export function useOrganization(
  organizationId: string,
  apiOptions?: UseApiDataOptions,
): UseOrganizationResult {
  const organizationsClient = useOrganizationsClient();
  const enabled = apiOptions?.enabled !== false && organizationId.trim().length > 0;

  const { data, loading, error, refetch } = useApiData<Organization>(
    () => organizationsClient.getOrganization(organizationId),
    [organizationsClient, organizationId],
    {
      enabled,
    },
  );

  return {
    organization: data,
    loading,
    error,
    refetch,
  };
}
