'use client';

import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type UseApiDataOptions = {
  enabled?: boolean;
};

type UseApiDataResult<TData> = {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

/**
 * Every data hook uses this function to load data.
 * This function uses TanStack Query.
 * `YouVersionProvider` holds the TanStack Query client.
 * The return value is always `{ data, loading, error, refetch }`.
 * This function does not return TanStack Query types.
 *
 * Each part of `queryKey` must be a string, a number, or another plain value.
 * The `queryKey` has this shape: `[...useQueryKeyBase(), '<hookName>', ...params]`.
 * Hooks that load user data also add `useUserScope()` to the `queryKey`.
 *
 * When the `queryKey` changes, TanStack Query keeps only the latest request.
 * If two components use the same `queryKey`, they share one request.
 * If the user returns to the same `queryKey`, the cache shows the data first.
 * Then TanStack Query fetches a new copy.
 */
export function useApiData<TData>(
  queryKey: readonly unknown[],
  fetchFn: () => Promise<TData>,
  options: UseApiDataOptions = {},
): UseApiDataResult<TData> {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await fetchFn();
      } catch (err) {
        // Consumers are promised `Error | null`; normalize non-Error throws.
        throw err instanceof Error ? err : new Error('Request failed');
      }
    },
    enabled,
  });

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  // This function uses `invalidateQueries`, not `query.refetch()`.
  // A refresh after a write is also an invalidation.
  // When a component remounts, invalidation still updates the cache.
  // `query.refetch()` calls an observer that is no longer active.
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeyRef.current, exact: true });
  }, [queryClient]);

  // If `enabled` is false, `data` and `error` are `null`.
  // The cache can still hold a value.
  // The usual reason to disable the hook is that the data must not appear.
  // A sign-out or a switch to a new user is the cause.
  // Old account data on screen is worse than a new fetch.
  //
  // The cache entry stays.
  // Hooks that load user data put the user in the `queryKey`.
  // As a result, one user cannot see data from another user.
  // If `enabled` is true again with the same `queryKey`, the cache returns the data at once.
  //
  // `loading` uses `isPending`, not `isFetching`.
  // On the first load, `loading` is `true`.
  // If the cache already has data, `loading` is `false`.
  // If `refetch` runs, `loading` stays `false`.
  // The current data stays on screen.
  //
  // If `enabled` is false, `loading` is `false`.
  // TanStack Query keeps `isPending` true.
  return {
    data: enabled ? (query.data ?? null) : null,
    loading: enabled && query.isPending,
    error: enabled ? (query.error ?? null) : null,
    refetch,
  };
}
