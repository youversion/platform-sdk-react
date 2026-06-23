'use client';

import { useApiData, type UseApiDataOptions } from './useApiData';
import { type Organization } from '@youversion/platform-core';
import { useOrganizationsClient } from './useOrganizationClient';

export function useOrganization(
  organizationId: string,
  apiOptions?: UseApiDataOptions,
): {
  organization: Organization | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
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
