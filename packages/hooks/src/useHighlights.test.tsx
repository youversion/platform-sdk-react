import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi, beforeEach, afterEach, it } from 'vitest';
import type { ReactNode } from 'react';
import { useHighlights } from './useHighlights';
import { YouVersionContext, YouVersionAuthContext } from './context';
import {
  HighlightsClient,
  YouVersionUserInfo,
  type Collection,
  type GetHighlightsOptions,
  type Highlight,
  type CreateHighlight,
} from '@youversion/platform-core';
import { createYVWrapper, TestQueryClientProvider } from './test/utils';
import type { AuthContextValue } from './types/auth';

describe('useHighlights', () => {
  const defaultOptions: GetHighlightsOptions = { version_id: 111, passage_id: 'MAT.1' };

  const mockHighlights: Collection<Highlight> = {
    data: [
      {
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      },
      {
        version_id: 111,
        passage_id: 'MAT.1.2',
        color: '5dff79',
      },
    ],
    next_page_token: null,
  };

  const mockHighlight: Highlight = {
    version_id: 111,
    passage_id: 'MAT.1.1',
    color: 'fffe00',
  };

  const mockGetHighlights = vi.fn();
  const mockCreateHighlight = vi.fn();
  const mockDeleteHighlight = vi.fn();

  beforeEach(() => {
    mockGetHighlights.mockReset();
    mockCreateHighlight.mockReset();
    mockDeleteHighlight.mockReset();
    mockGetHighlights.mockResolvedValue(mockHighlights);
    mockCreateHighlight.mockResolvedValue(mockHighlight);
    mockDeleteHighlight.mockResolvedValue(undefined);

    vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockImplementation(mockGetHighlights);
    vi.spyOn(HighlightsClient.prototype, 'createHighlight').mockImplementation(mockCreateHighlight);
    vi.spyOn(HighlightsClient.prototype, 'deleteHighlight').mockImplementation(mockDeleteHighlight);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useHighlights(defaultOptions))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should fetch through a HighlightsClient built from context', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHighlights).toHaveBeenCalledWith(defaultOptions);
    });

    it('should reuse the HighlightsClient across rerenders', async () => {
      const wrapper = createYVWrapper();
      const { result, rerender } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender();

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);
    });

    it('should create a new HighlightsClient when context values change', async () => {
      let currentAppKey = 'test-app-key';

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          <TestQueryClientProvider>{children}</TestQueryClientProvider>
        </YouVersionContext.Provider>
      );

      const { rerender } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(1);
      });

      currentAppKey = 'new-app-key';
      rerender();

      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('fetching highlights', () => {
    it('should fetch highlights with the provided options', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.highlights).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledWith(defaultOptions);
      expect.soft(result.current.highlights).toEqual(mockHighlights);
    });

    it('should refetch when options change', async () => {
      const wrapper = createYVWrapper();
      const { result, rerender } = renderHook(({ options }) => useHighlights(options), {
        wrapper,
        initialProps: { options: defaultOptions },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      rerender({ options: { version_id: 1, passage_id: 'JHN.3' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledTimes(2);
      expect.soft(mockGetHighlights).toHaveBeenLastCalledWith({
        version_id: 1,
        passage_id: 'JHN.3',
      });
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useHighlights(defaultOptions, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).not.toHaveBeenCalled();
      expect.soft(result.current.highlights).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const wrapper = createYVWrapper();
      const error = new Error('Failed to fetch highlights');
      mockGetHighlights.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.highlights).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(2);
      });
    });
  });

  it('should never show one user their predecessor cache, and restore it instantly on switch-back', async () => {
    // Highlights are account data: the cache key carries the user id, so an
    // account switch structurally cannot serve user A's rows to user B —
    // and switching back to A serves A's cache instantly while revalidating.
    const highlightsA: Collection<Highlight> = {
      data: [{ version_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' }],
      next_page_token: null,
    };
    const highlightsB: Collection<Highlight> = {
      data: [{ version_id: 111, passage_id: 'MAT.1.2', color: '5dff79' }],
      next_page_token: null,
    };
    mockGetHighlights.mockReset();
    mockGetHighlights
      .mockResolvedValueOnce(highlightsA) // user A, initial
      .mockResolvedValueOnce(highlightsB) // user B, initial
      .mockResolvedValue(highlightsA); // user A again, background revalidate

    const userA = new YouVersionUserInfo({ id: 'user-a', name: 'User A' });
    const userB = new YouVersionUserInfo({ id: 'user-b', name: 'User B' });
    let currentUser = userA;
    // The provider stack (and its QueryClient) persists across the account
    // switch — only the auth context value changes, as in a real sign-out /
    // sign-in without a page reload.
    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={{ appKey: 'test-app-key' }}>
        <YouVersionAuthContext.Provider
          value={{
            userInfo: currentUser,
            setUserInfo: () => undefined,
            isLoading: false,
            error: null,
          }}
        >
          <TestQueryClientProvider>{children}</TestQueryClientProvider>
        </YouVersionAuthContext.Provider>
      </YouVersionContext.Provider>
    );

    const { result, rerender } = renderHook(() => useHighlights(defaultOptions), { wrapper });

    await waitFor(() => {
      expect(result.current.highlights).toEqual(highlightsA);
    });

    // Switch to user B: the very first render must not leak A's rows.
    currentUser = userB;
    rerender();
    expect(result.current.highlights).toBe(null);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.highlights).toEqual(highlightsB);
    });
    expect(mockGetHighlights).toHaveBeenCalledTimes(2);

    // Switch back to A: A's cache serves instantly (no loading flash)…
    currentUser = userA;
    rerender();
    expect(result.current.highlights).toEqual(highlightsA);
    expect(result.current.loading).toBe(false);

    // …while a background revalidation still goes out.
    await waitFor(() => {
      expect(mockGetHighlights).toHaveBeenCalledTimes(3);
    });
  });

  it('should not fetch, and must not share a cache entry, while the account is unidentified', async () => {
    // An unidentified account has no safe cache key: auth still loading, or a
    // signed-in profile with no id. Two such accounts writing to one entry
    // would show each other's highlights, so the hook waits for the scope.
    const highlightsA: Collection<Highlight> = {
      data: [{ version_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' }],
      next_page_token: null,
    };
    mockGetHighlights.mockReset();
    mockGetHighlights.mockResolvedValue(highlightsA);

    let authValue: AuthContextValue = {
      userInfo: null,
      setUserInfo: () => undefined,
      isLoading: true,
      error: null,
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={{ appKey: 'test-app-key' }}>
        <YouVersionAuthContext.Provider value={authValue}>
          <TestQueryClientProvider>{children}</TestQueryClientProvider>
        </YouVersionAuthContext.Provider>
      </YouVersionContext.Provider>
    );

    const { result, rerender } = renderHook(() => useHighlights(defaultOptions), { wrapper });

    // Auth resolving: no request, no data.
    expect(mockGetHighlights).not.toHaveBeenCalled();
    expect(result.current.highlights).toBe(null);

    // Resolved, but the profile carries no id: still no safe key, still no request.
    authValue = {
      ...authValue,
      isLoading: false,
      userInfo: new YouVersionUserInfo({ name: 'No Id' }),
    };
    rerender();
    expect(mockGetHighlights).not.toHaveBeenCalled();
    expect(result.current.highlights).toBe(null);

    // An empty id is not an identity either. The profile schema accepts `''`, and
    // every account carrying it would key to the same entry.
    authValue = {
      ...authValue,
      userInfo: new YouVersionUserInfo({ id: '', name: 'Empty Id' }),
    };
    rerender();
    expect(mockGetHighlights).not.toHaveBeenCalled();
    expect(result.current.highlights).toBe(null);

    // The id lands: now the account has a key of its own and the fetch goes out.
    authValue = {
      ...authValue,
      userInfo: new YouVersionUserInfo({ id: 'user-a', name: 'User A' }),
    };
    rerender();
    await waitFor(() => {
      expect(result.current.highlights).toEqual(highlightsA);
    });
    expect(mockGetHighlights).toHaveBeenCalledTimes(1);
  });

  describe('createHighlight mutation', () => {
    it('should create highlight WITHOUT auto-refetching (callers coalesce refetches)', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      // The mount fetch.
      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      const createData: CreateHighlight = {
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      };

      const createPromise = result.current.createHighlight(createData);

      await waitFor(() => {
        expect(mockCreateHighlight).toHaveBeenCalledWith(createData);
      });

      const created = await createPromise;
      expect(created).toEqual(mockHighlight);

      // No implicit GET after the write — the mount fetch is still the only one.
      // A batching caller issues one refetch() after the whole batch settles.
      await Promise.resolve();
      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      // An explicit refetch still works and issues exactly one GET.
      result.current.refetch();
      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle create error', async () => {
      const wrapper = createYVWrapper();
      const error = new Error('Failed to create highlight');
      mockCreateHighlight.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const createData: CreateHighlight = {
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      };

      await expect(result.current.createHighlight(createData)).rejects.toThrow(
        'Failed to create highlight',
      );

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteHighlight mutation', () => {
    it('should delete highlight WITHOUT auto-refetching (callers coalesce refetches)', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      const deletePromise = result.current.deleteHighlight('MAT.1.1', { version_id: 111 });

      await waitFor(() => {
        expect(mockDeleteHighlight).toHaveBeenCalledWith('MAT.1.1', { version_id: 111 });
      });

      await deletePromise;

      // No implicit GET after the delete.
      await Promise.resolve();
      expect(mockGetHighlights).toHaveBeenCalledTimes(1);
    });

    it('should handle delete error', async () => {
      const wrapper = createYVWrapper();
      const error = new Error('Failed to delete highlight');
      mockDeleteHighlight.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHighlights(defaultOptions), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.deleteHighlight('MAT.1.1', { version_id: 111 })).rejects.toThrow(
        'Failed to delete highlight',
      );

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);
    });
  });
});
