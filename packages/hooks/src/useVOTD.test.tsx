import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import type { ReactNode } from 'react';
import { useVerseOfTheDay } from './useVOTD';
import { YouVersionContext } from './context';
import { type VOTD } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper, TestQueryClientProvider } from './test/utils';

describe('useVerseOfTheDay', () => {
  const mockVOTD: VOTD = {
    day: 1,
    passage_id: 'ISA.43.19',
  };

  const mockGetVOTD = vi.fn();
  const bibleClient = createBibleClientStub({ getVOTD: mockGetVOTD });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  beforeEach(() => {
    mockGetVOTD.mockReset();
    mockGetVOTD.mockResolvedValue(mockVOTD);
  });

  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useVerseOfTheDay(1))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const emptyWrapper = createYVWrapper('');

      expect(() => renderHook(() => useVerseOfTheDay(1), { wrapper: emptyWrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should use the injected BibleClient', async () => {
      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledWith(1);
    });

    it('should reuse the injected BibleClient across rerenders', async () => {
      const { result, rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender();

      expect(mockGetVOTD).toHaveBeenCalledTimes(1);
    });

    it('should fetch again when the provider config changes', async () => {
      // Cache identity keys on provider config (which determines client
      // identity), not on the client instance itself — so a config change is
      // what invalidates previously fetched data.
      let currentAppKey = 'test-app-key';
      const swappingWrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider value={{ appKey: currentAppKey, bibleClient }}>
          <TestQueryClientProvider>{children}</TestQueryClientProvider>
        </YouVersionContext.Provider>
      );

      const { rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper: swappingWrapper });

      await waitFor(() => {
        expect(mockGetVOTD).toHaveBeenCalledTimes(1);
      });

      currentAppKey = 'new-app-key';
      rerender();

      await waitFor(() => {
        expect(mockGetVOTD).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('fetching VOTD', () => {
    it('should fetch VOTD for day 1', async () => {
      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).toHaveBeenCalledWith(1);
      expect.soft(result.current.data).toEqual(mockVOTD);
    });

    it('should fetch VOTD for day 100', async () => {
      const mockVOTD100: VOTD = { day: 100, passage_id: 'PSA.23.1' };
      mockGetVOTD.mockResolvedValueOnce(mockVOTD100);

      const { result } = renderHook(() => useVerseOfTheDay(100), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).toHaveBeenCalledWith(100);
      expect.soft(result.current.data).toEqual(mockVOTD100);
    });

    it('should fetch VOTD for day 366', async () => {
      const mockVOTD366: VOTD = { day: 366, passage_id: 'REV.22.21' };
      mockGetVOTD.mockResolvedValueOnce(mockVOTD366);

      const { result } = renderHook(() => useVerseOfTheDay(366), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).toHaveBeenCalledWith(366);
      expect.soft(result.current.data).toEqual(mockVOTD366);
    });

    it('should refetch when day changes', async () => {
      const { result, rerender } = renderHook(({ day }) => useVerseOfTheDay(day), {
        wrapper,
        initialProps: { day: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVOTD).toHaveBeenLastCalledWith(1);

      rerender({ day: 100 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVOTD).toHaveBeenLastCalledWith(100);
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useVerseOfTheDay(1, { enabled: false }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).not.toHaveBeenCalled();
      expect.soft(result.current.data).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch VOTD');
      mockGetVOTD.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.data).toBe(null);
    });

    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetVOTD).toHaveBeenCalledTimes(2);
      });
    });
  });
});
