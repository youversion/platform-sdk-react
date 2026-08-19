'use client';

import { useContext, useMemo } from 'react';
import { OrganizationsClient } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import { useApiClient } from './internal/useApiClient';

export function useOrganizationsClient(): OrganizationsClient {
  const override = useContext(YouVersionContext)?.organizationsClient;
  const apiClient = useApiClient();
  const constructed = useMemo(() => new OrganizationsClient(apiClient), [apiClient]);
  return override ?? constructed;
}
