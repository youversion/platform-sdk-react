'use client';

import { useCallback, useRef } from 'react';
import {
  keepPreviousData as keepPreviousDataPlaceholder,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';
import { useInternalQueryClient } from './internal/QueryClientContext';

export type UseApiDataOptions = {
  enabled?: boolean;
  /**
   * Controls what `data` holds while a `queryKey` change is being fetched.
   * `true` (the default) keeps the previous key's data on screen, with
   * `loading: true`, until the new data lands — so navigating chapters shows
   * the current chapter under a loading treatment instead of a blank state.
   *
   * Account-scoped hooks must pass `false`: their `queryKey` carries the user
   * scope, and holding data across a user switch would show one account's
   * data to another.
   */
  keepPreviousData?: boolean;
};

type UseApiDataResult<TData> = {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

type CacheControlPolicy = {
  allowsCaching: boolean;
  remainingMs: number;
};

type ApiDataEnvelope<TData> = {
  data: TData;
  policy: CacheControlPolicy;
};

function isApiDataEnvelope<TData>(
  result: TData | ApiDataEnvelope<TData>,
): result is ApiDataEnvelope<TData> {
  if (!(result instanceof Object)) {
    return false;
  }
  if (!('data' in result) || !('policy' in result)) {
    return false;
  }
  const { policy } = result;
  if (!(policy instanceof Object)) {
    return false;
  }
  if (!('allowsCaching' in policy) || !('remainingMs' in policy)) {
    return false;
  }
  return (
    (policy.allowsCaching === true || policy.allowsCaching === false) &&
    Number.isFinite(policy.remainingMs)
  );
}

function applyCacheLifetime(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  lifetimeMs: number,
): void {
  const lifetime = { staleTime: lifetimeMs, gcTime: lifetimeMs };
  // Later mounts in this provider pick these up. Do not pass staleTime on
  // useQuery — that would override them on remount.
  queryClient.setQueryDefaults(queryKey, lifetime);
  // The query created for this fetch still has the client default gcTime
  // (five minutes). Write remaining lifetime onto that instance so an
  // unused entry is not collected before Cache-Control says it is stale.
  const query = queryClient.getQueryCache().find({ queryKey, exact: true });
  if (query) {
    query.setOptions({ ...query.options, ...lifetime });
  }
}

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
 * While that request is in flight, `data` still holds the previous key's data
 * (see `UseApiDataOptions.keepPreviousData`).
 * If two components use the same `queryKey`, they share one request.
 * If the user returns to the same `queryKey`, the cache shows the data first.
 * Then TanStack Query fetches a new copy, unless a `{ data, policy }` envelope
 * set a remaining lifetime on that key.
 */
export function useApiData<TData>(
  queryKey: readonly unknown[],
  fetchFn: () => Promise<TData | ApiDataEnvelope<TData>>,
  options: UseApiDataOptions = {},
): UseApiDataResult<TData> {
  const { enabled = true, keepPreviousData = true } = options;
  const queryClient = useInternalQueryClient();

  // The client goes to `useQuery` as an explicit argument, so this hook never
  // reads TanStack's own context — see `QueryClientContext` for why.
  const query = useQuery(
    {
      queryKey,
      queryFn: async () => {
        try {
          const result = await fetchFn();
          if (isApiDataEnvelope(result)) {
            const lifetimeMs = result.policy.allowsCaching ? result.policy.remainingMs : 0;
            applyCacheLifetime(queryClient, queryKey, lifetimeMs);
            return result.data;
          }
          return result;
        } catch (err) {
          // Consumers are promised `Error | null`; normalize non-Error throws.
          throw err instanceof Error ? err : new Error('Request failed');
        }
      },
      enabled,
      placeholderData: keepPreviousData ? keepPreviousDataPlaceholder : undefined,
    },
    queryClient,
  );

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
  // `loading` is `true` while `data` is not the settled result for the
  // current `queryKey`:
  // - the first load of a key (`isPending`),
  // - a key change still showing the previous key's data (`isPlaceholderData`)
  //   while the new fetch is in flight, and
  // - a new fetch after an error (`isError` with `isFetching`), so a `refetch`
  //   from an error state shows progress instead of a frozen error.
  //   This clause covers an errored read that still holds data from an earlier
  //   success; `error` keeps the failure until the retry settles. TanStack
  //   Query resets an errored read without data to pending, which the first
  //   clause covers.
  // A background revalidation of already-settled data keeps `loading` `false`,
  // so the current data stays on screen through a `refetch`.
  //
  // If `enabled` is false, `loading` is `false`.
  // TanStack Query keeps `isPending` true.
  return {
    data: enabled ? (query.data ?? null) : null,
    loading:
      enabled &&
      (query.isPending ||
        (query.isPlaceholderData && query.isFetching) ||
        (query.isError && query.isFetching)),
    error: enabled ? (query.error ?? null) : null,
    refetch,
  };
}
