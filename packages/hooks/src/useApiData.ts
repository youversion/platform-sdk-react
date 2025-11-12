'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const fetchData = useCallback(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let canceled = false;

    setLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        if (!canceled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!canceled) {
          setError(err as Error);
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [fetchFn, enabled]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
    // @eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}
