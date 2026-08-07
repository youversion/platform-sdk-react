/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useApiData, type UseApiDataOptions } from './useApiData';

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
    const deferreds: PromiseWithResolvers<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = Promise.withResolvers<string>();
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
    const deferreds: PromiseWithResolvers<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = Promise.withResolvers<string>();
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

  it('keeps a stable refetch identity across re-renders with an inline fetchFn', async () => {
    // Callers pass a fresh inline arrow every render; refetch must not churn.
    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(() => Promise.resolve(scope), ['stable-dep']),
      { initialProps: { scope: 'a' } },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('a');
    });

    const firstRefetch = result.current.refetch;
    rerender({ scope: 'b' });
    rerender({ scope: 'c' });

    expect(result.current.refetch).toBe(firstRefetch);
  });

  it('refetch uses the latest inline fetchFn after re-renders', async () => {
    // The ref must hold the newest closure so a refetch reflects current props.
    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(() => Promise.resolve(scope), ['stable-dep']),
      { initialProps: { scope: 'a' } },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('a');
    });

    // Deps unchanged, so no effect-driven refetch; only the closure updates.
    rerender({ scope: 'b' });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('b');
    });
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

describe('useApiData — automatic retry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** The error shape `ApiClient` throws for a non-2xx response. */
  function httpError(status: number): Error {
    return Object.assign(new Error(`Request failed with status ${status}`), { status });
  }

  /**
   * A `fetchFn` handing out one deferred per call, so each attempt can be
   * settled independently. Same approach as the stale-response tests above,
   * with fake timers added to step through the backoff.
   */
  function deferredFetchFn() {
    const deferreds: PromiseWithResolvers<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = Promise.withResolvers<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });
    return { deferreds, fetchFn };
  }

  /** Drains the microtask queue so a settled promise reaches its handlers. */
  async function flush(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  /** Runs out the backoff timer scheduled after `attempt`. */
  async function runBackoff(attempt: number): Promise<void> {
    await act(async () => {
      // Full jitter means the delay is somewhere inside the window, so advance
      // past the whole window: 500ms for attempt 0, 1500ms for attempt 1.
      await vi.advanceTimersByTimeAsync(attempt === 0 ? 500 : 1500);
    });
  }

  it('retries a 503 and commits the second attempt result', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { result } = renderHook(() => useApiData(fetchFn, ['dep']));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    deferreds[0]!.reject(httpError(503));
    await flush();

    // The failure is swallowed while a retry is pending.
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    deferreds[1]!.resolve('recovered');
    await flush();

    expect(result.current.data).toBe('recovered');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('keeps loading true across the backoff', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { result } = renderHook(() => useApiData(fetchFn, ['dep']));

    deferreds[0]!.reject(httpError(503));
    await flush();

    // A spinner that settles between attempts would flicker.
    expect(result.current.loading).toBe(true);

    await runBackoff(0);
    expect(result.current.loading).toBe(true);

    deferreds[1]!.resolve('recovered');
    await flush();

    expect(result.current.loading).toBe(false);
  });

  it('does not retry a 401; the error surfaces on the first failure', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { result } = renderHook(() => useApiData(fetchFn, ['dep']));

    deferreds[0]!.reject(httpError(401));
    await flush();

    expect(result.current.error?.message).toBe('Request failed with status 401');
    expect(result.current.loading).toBe(false);

    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('stops at the attempt cap and surfaces the last error', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { result } = renderHook(() => useApiData(fetchFn, ['dep']));

    deferreds[0]!.reject(new TypeError('Failed to fetch'));
    await flush();
    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    deferreds[1]!.reject(new TypeError('Failed to fetch'));
    await flush();
    await runBackoff(1);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    deferreds[2]!.reject(new TypeError('final failure'));
    await flush();

    // Two extra attempts is the cap: three requests in total.
    expect(result.current.error?.message).toBe('final failure');
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('stops when the wall-clock budget runs out before the attempt cap', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { result } = renderHook(() => useApiData(fetchFn, ['dep']));

    // A request that hangs until the 10 second client timeout fires.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    deferreds[0]!.reject(new Error('Request timeout after 10000ms'));
    await flush();

    // 10s elapsed, still inside the 20s budget, so one retry goes out.
    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    deferreds[1]!.reject(new Error('Request timeout after 10000ms'));
    await flush();

    // Past 20s now. The attempt cap still had one attempt left; the clock did not.
    expect(result.current.error?.message).toBe('Request timeout after 10000ms');
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('cancels the retry chain when deps change during the backoff', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(fetchFn, [scope]),
      { initialProps: { scope: 'JHN.3' } },
    );

    deferreds[0]!.reject(httpError(503));
    await flush();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // The user changes chapter while the backoff is still pending.
    rerender({ scope: 'JHN.4' });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // The pending backoff fires and finds it no longer holds the ticket.
    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();

    deferreds[1]!.resolve('JHN.4 data');
    await flush();

    expect(result.current.data).toBe('JHN.4 data');
    expect(result.current.error).toBeNull();
  });

  it('does not write state from a retry chain abandoned at unmount', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();

    const { unmount } = renderHook(() => useApiData(fetchFn, ['dep']));

    deferreds[0]!.reject(httpError(503));
    await flush();

    unmount();

    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('makes a single attempt when retry is false', async () => {
    vi.useFakeTimers();
    const { deferreds, fetchFn } = deferredFetchFn();
    const options: UseApiDataOptions = { retry: false };

    const { result } = renderHook(() => useApiData(fetchFn, ['dep'], options));

    deferreds[0]!.reject(httpError(503));
    await flush();

    expect(result.current.error?.message).toBe('Request failed with status 503');
    expect(result.current.loading).toBe(false);

    await runBackoff(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
