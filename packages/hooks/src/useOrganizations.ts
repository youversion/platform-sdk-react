'use client';

import { useEffect, useRef, useState } from 'react';
import { type Organization, type OrganizationsClient } from '@youversion/platform-core';
import { useOrganizationsClient } from './useOrganizationsClient';
import { useHookOverride } from './useHookOverride';

/** Normalizes a raw id list into a unique set of non-empty, trimmed ids. */
function toUniqueIds(ids: (string | null | undefined)[]): string[] {
  return Array.from(new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)));
}

/**
 * Fetches the given organizations concurrently, tolerating individual failures.
 * Returns a Map of only the successfully-resolved entries; rejected requests
 * are omitted so a single failure never rejects the batch.
 */
async function fetchOrganizations(
  client: OrganizationsClient,
  ids: string[],
): Promise<Map<string, Organization>> {
  const results = await Promise.allSettled(ids.map((id) => client.getOrganization(id)));
  const resolved = new Map<string, Organization>();
  ids.forEach((id, index) => {
    const result = results[index];
    if (result?.status === 'fulfilled') resolved.set(id, result.value);
  });
  return resolved;
}

/**
 * Resolves multiple organizations at once, deduplicating by id so a list of
 * versions that share publishers only triggers one request per unique
 * organization. Returns a Map keyed by organization id.
 */
export type UseOrganizationsResult = {
  organizations: Map<string, Organization>;
};

export function useOrganizations(
  organizationIds: (string | null | undefined)[],
): UseOrganizationsResult {
  const override = useHookOverride('useOrganizations');
  const client = useOrganizationsClient();
  const [organizations, setOrganizations] = useState<Map<string, Organization>>(new Map());
  const cacheRef = useRef<Map<string, Organization>>(new Map());
  const clientRef = useRef(client);

  const uniqueIds = override ? [] : toUniqueIds(organizationIds);
  // Stable dependency key so the effect only re-runs when the id set changes.
  const idsKey = uniqueIds.slice().sort().join(',');

  useEffect(() => {
    if (override) return;

    // A new client identity (e.g. appKey/host change) invalidates the cache.
    // Handled here so there is no cross-effect ordering dependence.
    if (clientRef.current !== client) {
      clientRef.current = client;
      cacheRef.current = new Map();
      setOrganizations(new Map());
    }

    const missing = uniqueIds.filter((id) => !cacheRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    void fetchOrganizations(client, missing).then((resolved) => {
      if (cancelled || resolved.size === 0) return;
      resolved.forEach((org, id) => cacheRef.current.set(id, org));
      setOrganizations(new Map(cacheRef.current));
    });

    return () => {
      cancelled = true;
    };
  }, [client, idsKey, override]);

  if (override) return override(organizationIds);
  return { organizations };
}
