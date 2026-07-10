'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type UseApiDataOptions = {
  enabled?: boolean;
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
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Monotonic sequence per issued request: only the latest-issued request may
  // commit state. This covers refetch-initiated requests too, which a
  // per-effect cancel closure would miss — a stale refetch (e.g. for a
  // previous chapter) resolving after a newer fetch must not overwrite it.
  const requestSeqRef = useRef(0);

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

    fetchFn()
      .then((result) => {
        if (requestSeq === requestSeqRef.current) {
          setData(result);
        }
      })
      .catch((err) => {
        if (requestSeq === requestSeqRef.current) {
          setError(err as Error);
        }
      })
      .finally(() => {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      });
  }, [fetchFn, enabled]);

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
    // @eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return { data, loading, error, refetch };
}
