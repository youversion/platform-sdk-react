/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentType, ReactNode } from 'react';
import { YouVersionProvider } from './context/YouVersionProvider';
import { useApiData, type UseApiDataOptions } from './useApiData';

// The real provider supplies the private QueryClient `useApiData` runs on —
// one per provider instance, so each mounted wrapper is cache-isolated.
const createWrapper = (): ComponentType<{ children: ReactNode }> => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionProvider appKey="test-app-key">{children}</YouVersionProvider>
  );
  return Wrapper;
};

// TanStack Query batches state notifications on a macrotask scheduled from the
// promise's microtask chain; two timer turns guarantee the notification for an
// already-settled promise has landed (a bare `await Promise.resolve()` — or a
// single turn — races it).
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('useApiData — enabled transitions', () => {
  it('fetches when enabled flips from false to true with an unchanged key', async () => {
    const fetchFn = vi.fn().mockResolvedValue('payload');

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useApiData(['stable-key'], fetchFn, { enabled }),
      { initialProps: { enabled: false }, wrapper: createWrapper() },
    );

    // Disabled on mount (e.g. auth still resolving): no request goes out.
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    // Auth resolves: enabled flips true while the caller's key is unchanged.
    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.data).toBe('payload');
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clears data (without refetching) when enabled flips from true to false', async () => {
    const fetchFn = vi.fn().mockResolvedValue('user-a-data');

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useApiData(['stable-key'], fetchFn, { enabled }),
      { initialProps: { enabled: true }, wrapper: createWrapper() },
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

  it('serves from cache on re-enable, then revalidates in background', async () => {
    const fetchFn = vi.fn().mockResolvedValue('cached-value');

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useApiData(['stable-key'], fetchFn, { enabled }),
      { initialProps: { enabled: true }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('cached-value');
    });

    rerender({ enabled: false });
    expect(result.current.data).toBeNull();

    // Re-enable under the same key: the surviving cache entry is visible
    // immediately (no loading flash), and a background refetch still fires.
    rerender({ enabled: true });
    expect(result.current.data).toBe('cached-value');
    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useApiData — key transitions', () => {
  it('keeps the previous data, with loading true, while a new key fetches', async () => {
    // The Bible reader's next-chapter treatment depends on this: the current
    // chapter stays on screen (dimmed, spinner overlaid) instead of blanking.
    const deferreds: PromiseWithResolvers<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = Promise.withResolvers<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(['chapter', scope], fetchFn),
      { initialProps: { scope: 'JHN.3' }, wrapper: createWrapper() },
    );

    await act(async () => {
      deferreds[0]!.resolve('JHN.3 data');
      await flush();
    });
    expect(result.current.data).toBe('JHN.3 data');
    expect(result.current.loading).toBe(false);

    // Next chapter: the previous chapter stays visible under a loading state.
    rerender({ scope: 'JHN.4' });
    expect(result.current.data).toBe('JHN.3 data');
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      deferreds[1]!.resolve('JHN.4 data');
      await flush();
    });
    expect(result.current.data).toBe('JHN.4 data');
    expect(result.current.loading).toBe(false);
  });

  it('drops to null across a key change when keepPreviousData is false', async () => {
    // Account-scoped hooks (useHighlights) rely on this: previous data must
    // not linger when the key's user scope changes.
    const deferreds: PromiseWithResolvers<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = Promise.withResolvers<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) =>
        useApiData(['highlights', scope], fetchFn, { keepPreviousData: false }),
      { initialProps: { scope: 'user-a' }, wrapper: createWrapper() },
    );

    await act(async () => {
      deferreds[0]!.resolve('user-a data');
      await flush();
    });
    expect(result.current.data).toBe('user-a data');

    rerender({ scope: 'user-b' });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      deferreds[1]!.resolve('user-b data');
      await flush();
    });
    expect(result.current.data).toBe('user-b data');
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
      ({ scope }: { scope: string }) => useApiData(['chapter', scope], fetchFn),
      { initialProps: { scope: 'JHN.3' }, wrapper: createWrapper() },
    );

    // Initial fetch for JHN.3 resolves normally.
    await act(async () => {
      deferreds[0]!.resolve('JHN.3 data');
      await flush();
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
      await flush();
    });
    expect(result.current.data).toBe('JHN.4 data');

    // The stale JHN.3 refetch finally lands — it must not clobber JHN.4.
    await act(async () => {
      deferreds[1]!.resolve('stale JHN.3 data');
      await flush();
    });
    expect(result.current.data).toBe('JHN.4 data');
    expect(result.current.loading).toBe(false);
  });

  it('ignores a stale error from an abandoned request', async () => {
    const deferreds: PromiseWithResolvers<string>[] = [];
    const fetchFn = vi.fn(() => {
      const deferred = Promise.withResolvers<string>();
      deferreds.push(deferred);
      return deferred.promise;
    });

    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(['chapter', scope], fetchFn),
      { initialProps: { scope: 'JHN.3' }, wrapper: createWrapper() },
    );

    // Navigate away while the first request is still in flight.
    rerender({ scope: 'JHN.4' });
    await act(async () => {
      deferreds[1]!.resolve('JHN.4 data');
      await flush();
    });
    expect(result.current.data).toBe('JHN.4 data');

    // The abandoned JHN.3 request fails late — the error must not surface.
    await act(async () => {
      deferreds[0]!.reject(new Error('stale failure'));
      await flush();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('JHN.4 data');
  });
});

describe('useApiData — existing behavior', () => {
  it('does not fetch when enabled is false for the whole lifetime', () => {
    const fetchFn = vi.fn().mockResolvedValue('never');
    const options: UseApiDataOptions = { enabled: false };

    const { result } = renderHook(() => useApiData(['key'], fetchFn, options), {
      wrapper: createWrapper(),
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('normalizes a non-Error throw into an Error', async () => {
    // Consumers are promised `Error | null` — a string throw must not leak.
    const fetchFn = vi.fn().mockRejectedValue('plain string failure');

    const { result } = renderHook(() => useApiData(['key'], fetchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe('Request failed');
    expect(result.current.loading).toBe(false);
  });

  it('keeps a stable refetch identity across re-renders with an inline fetchFn', async () => {
    // Callers pass a fresh inline arrow every render; refetch must not churn.
    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(['stable-key'], () => Promise.resolve(scope)),
      { initialProps: { scope: 'a' }, wrapper: createWrapper() },
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
    // The latest closure must win so a refetch reflects current props.
    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) => useApiData(['stable-key'], () => Promise.resolve(scope)),
      { initialProps: { scope: 'a' }, wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toBe('a');
    });

    // Key unchanged, so no key-driven refetch; only the closure updates.
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

    const { result } = renderHook(() => useApiData(['key'], fetchFn), {
      wrapper: createWrapper(),
    });

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

  it('never touches persistent storage across a fetch + refetch cycle', async () => {
    // The cache is memory-only by design: no persister is configured, so a
    // full fetch + refetch cycle must not write localStorage (and jsdom has
    // no indexedDB for anything to have used).
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const fetchFn = vi.fn().mockResolvedValue('ephemeral');

    const { result } = renderHook(() => useApiData(['key'], fetchFn), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBe('ephemeral');
    });

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    // Core may persist its installation id; nothing else may be written.
    const keysWritten = setItem.mock.calls.map(([key]) => key);
    expect(keysWritten.filter((key) => key !== 'x-yvp-installation-id')).toEqual([]);
    expect('indexedDB' in globalThis && globalThis.indexedDB).toBeFalsy();
    setItem.mockRestore();
  });
});
