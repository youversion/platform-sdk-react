'use client';

import { useMemo } from 'react';
import { OrganizationsClient } from '@youversion/platform-core';
import { useApiClient } from './internal/useApiClient';

export function useOrganizationsClient(): OrganizationsClient {
  const apiClient = useApiClient();
  return useMemo(() => new OrganizationsClient(apiClient), [apiClient]);
}
