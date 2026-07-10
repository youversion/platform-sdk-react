/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApiData, type UseApiDataOptions } from './useApiData';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useApiData — enabled transitions', () => {
  it('fetches when enabled flips from false to true with unchanged deps', async () => {
    const fetchFn = vi.fn().mockResolvedValue('payload');

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useApiData(fetchFn, ['stable-dep'], { enabled }),
      { initialProps: { enabled: false } },
    );

    // Disabled on mount (e.g. auth still resolving): no request goes out.
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    // Auth resolves: enabled flips true while the caller's deps are unchanged.
    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.data).toBe('payload');
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clears data (without refetching) when enabled flips from true to false', async () => {
    const fetchFn = vi.fn().mockResolvedValue('user-a-data');

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useApiData(fetchFn, ['stable-dep'], { enabled }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('user-a-data');
    });

    // Sign-out (or auth switching users): stale account data must not linger.
    rerender({ enabled: false });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('useApiData — stale responses (latest wins)', () => {
  it('ignores a stale refetch response that resolves after a newer fetch', async () => {
    const deferreds: Deferred<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(fetchFn, [scope]),
      { initialProps: { scope: 'JHN.3' } },
    );

    // Initial fetch for JHN.3 resolves normally.
    await act(async () => {
      deferreds[0]!.resolve('JHN.3 data');
      await Promise.resolve();
    });
    expect(result.current.data).toBe('JHN.3 data');

    // A refetch for JHN.3 goes out (e.g. after a highlight write)…
    act(() => {
      result.current.refetch();
    });
    expect(deferreds).toHaveLength(2);

    // …then the user navigates to JHN.4, whose fetch resolves first.
    rerender({ scope: 'JHN.4' });
    expect(deferreds).toHaveLength(3);
    await act(async () => {
      deferreds[2]!.resolve('JHN.4 data');
      await Promise.resolve();
    });
    expect(result.current.data).toBe('JHN.4 data');

    // The stale JHN.3 refetch finally lands — it must not clobber JHN.4.
    await act(async () => {
      deferreds[1]!.resolve('stale JHN.3 data');
      await Promise.resolve();
    });
    expect(result.current.data).toBe('JHN.4 data');
    expect(result.current.loading).toBe(false);
  });

  it('ignores a stale error from an invalidated request', async () => {
    const deferreds: Deferred<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = createDeferred<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(fetchFn, [scope]),
      { initialProps: { scope: 'JHN.3' } },
    );

    // Navigate away while the first request is still in flight.
    rerender({ scope: 'JHN.4' });
    await act(async () => {
      deferreds[1]!.resolve('JHN.4 data');
      await Promise.resolve();
    });
    expect(result.current.data).toBe('JHN.4 data');

    // The abandoned JHN.3 request fails late — the error must not surface.
    await act(async () => {
      deferreds[0]!.reject(new Error('stale failure'));
      await Promise.resolve();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('JHN.4 data');
  });
});

describe('useApiData — existing behavior', () => {
  it('does not fetch when enabled is false for the whole lifetime', () => {
    const fetchFn = vi.fn().mockResolvedValue('never');
    const options: UseApiDataOptions = { enabled: false };

    const { result } = renderHook(() => useApiData(fetchFn, ['dep'], options));

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('refetches on demand', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    const { result } = renderHook(() => useApiData(fetchFn, ['dep']));

    await waitFor(() => {
      expect(result.current.data).toBe('first');
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('second');
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
