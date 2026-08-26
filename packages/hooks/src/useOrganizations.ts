'use client';

import { useCallback, useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { type Organization } from '@youversion/platform-core';
import { useOrganizationsClient } from './useOrganizationsClient';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { useHookOverride } from './useHookOverride';

/** Drops null, undefined, and blank ids, then dedupes what is left. */
function toUniqueIds(ids: (string | null | undefined)[]): string[] {
  return Array.from(new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)));
}

/**
 * Separator for the id-list identity string. A NUL byte cannot appear in an id,
 * so the joined form always splits back into the same list.
 */
const ID_SEPARATOR = '\u0000';

export type UseOrganizationsResult = {
  organizations: Map<string, Organization>;
};

/**
 * Resolves multiple organizations at once, deduplicating by id so a list of
 * versions that share publishers only triggers one request per unique
 * organization. Returns a Map keyed by organization id.
 *
 * Each id gets its own query, keyed exactly as `useOrganization` keys it, so
 * the two hooks share cache entries. An id already in the cache costs no
 * request, and growing the id list fetches only the genuinely new ids.
 *
 * Individual failures are tolerated: a rejected id is absent from the Map while
 * the rest of the batch still resolves.
 */
export function useOrganizations(
  organizationIds: (string | null | undefined)[],
): UseOrganizationsResult {
  const override = useHookOverride('useOrganizations');
  const client = useOrganizationsClient();
  const keyBase = useQueryKeyBase();

  // Sorting makes the identity independent of the caller's ordering, so a
  // reordered list of the same ids reuses the same array instance. That keeps
  // `combine` stable, and with it the returned Map.
  const idsKey = toUniqueIds(organizationIds).sort().join(ID_SEPARATOR);
  const uniqueIds = useMemo(() => (idsKey ? idsKey.split(ID_SEPARATOR) : []), [idsKey]);

  // TanStack Query memoizes `combine` on its own identity and on the query
  // results, so the Map instance changes only when an id resolves, fails, or
  // leaves the list.
  const combine = useCallback(
    (results: UseQueryResult<Organization, Error>[]): UseOrganizationsResult => {
      const organizations = new Map<string, Organization>();
      uniqueIds.forEach((id, index) => {
        const organization = results[index]?.data;
        if (organization) organizations.set(id, organization);
      });
      return { organizations };
    },
    [uniqueIds],
  );

  const result = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: [...keyBase, 'organization', id],
      queryFn: () => client.getOrganization(id),
      enabled: !override,
    })),
    combine,
  });

  if (override) return override(organizationIds);
  return result;
}
