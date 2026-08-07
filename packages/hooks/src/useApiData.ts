'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  backoffMs,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BUDGET_MS,
  isRetryableRequestError,
} from './internal/retry-policy';

export type UseApiDataOptions = {
  enabled?: boolean;
  /**
   * Retry a failed request automatically. Defaults to `true`.
   *
   * A retryable failure (timeout, transport failure, 429, 5xx) gets up to
   * {@link DEFAULT_MAX_RETRIES} extra attempts within a
   * {@link DEFAULT_RETRY_BUDGET_MS} wall clock, whichever runs out first.
   * `loading` stays `true` for the whole chain.
   *
   * Set `false` for a poll or a fire-and-forget read that owns its own
   * cadence and should fail fast instead.
   */
  retry?: boolean;
};

type UseApiDataResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useApiData<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList,
  options: UseApiDataOptions = {},
): UseApiDataResult<T> {
  const { enabled = true, retry = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Monotonic sequence per issued request: only the latest-issued request may
  // commit state. This covers refetch-initiated requests too, which a
  // per-effect cancel closure would miss — a stale refetch (e.g. for a
  // previous chapter) resolving after a newer fetch must not overwrite it.
  const requestSeqRef = useRef(0);

  // Hold the (typically inline) `fetchFn` in a ref, refreshed every render, so
  // it can stay out of `fetchData`'s deps below. Otherwise a new closure each
  // render would churn `fetchData` — and therefore `refetch` — identity every
  // render. `fetchData` reads the ref only when a fetch actually starts, and
  // the ref is updated during render before any effect runs, so a dep-change
  // fetch still uses the latest `fetchFn`.
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetchData = useCallback(() => {
    const requestSeq = ++requestSeqRef.current;

    if (!enabled) {
      // Disabling drops previously fetched data instead of keeping it: the
      // usual reason to disable is that the data must no longer be shown
      // (signed out, auth switched to a different user), and leaking stale
      // account data across sessions is worse than a refetch on re-enable.
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // One wall clock for the whole chain, started here rather than per attempt.
    const startedAt = Date.now();

    const isCurrent = (): boolean => requestSeq === requestSeqRef.current;

    // `loading` deliberately stays true across the whole chain: it settles only
    // on success or on final failure, never between attempts, so the two-tier
    // spinner in the reader does not flicker while a retry is pending.
    const attempt = (attemptIndex: number): void => {
      fetchFnRef
        .current()
        .then((result) => {
          if (!isCurrent()) return;
          setData(result);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (!isCurrent()) return;

          const budgetLeft = Date.now() - startedAt < DEFAULT_RETRY_BUDGET_MS;
          const attemptsLeft = attemptIndex < DEFAULT_MAX_RETRIES;

          if (retry && attemptsLeft && budgetLeft && isRetryableRequestError(err)) {
            setTimeout(() => {
              // Re-check: the chapter may have changed during the backoff.
              if (isCurrent()) attempt(attemptIndex + 1);
            }, backoffMs(attemptIndex));
            return;
          }

          setError(err as Error);
          setLoading(false);
        });
    };

    attempt(0);
  }, [enabled, retry]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // `enabled` rides alongside the caller-supplied deps so a false→true flip
  // (e.g. auth resolving after mount, with the caller's deps unchanged)
  // actually triggers the fetch.
  useEffect(() => {
    fetchData();
    return () => {
      // Invalidate any in-flight request (effect- or refetch-initiated) when
      // the deps change or the component unmounts.
      requestSeqRef.current++;
    };
  }, [...deps, enabled]);

  return { data, loading, error, refetch };
}
