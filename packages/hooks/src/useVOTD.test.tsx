import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { useVerseOfTheDay } from './useVOTD';
import { YouVersionContext } from './context';
import { BibleClient, ApiClient, type VOTD } from '@youversion/platform-core';
import { createYVWrapper } from './test/utils';

vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    BibleClient: vi.fn(function () {
      return {};
    }),
    ApiClient: vi.fn(function () {
      return { isApiClient: true };
    }),
  };
});

describe('useVerseOfTheDay', () => {
  const mockVOTD: VOTD = {
    day: 1,
    passage_id: 'ISA.43.19',
  };

  let mockGetVOTD: Mock;

  beforeEach(() => {
    mockGetVOTD = vi.fn().mockResolvedValue(mockVOTD);

    (BibleClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getVOTD: mockGetVOTD,
      };
    });

    (ApiClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        isApiClient: true,
      };
    });
  });

  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useVerseOfTheDay(1))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createYVWrapper('');

      expect(() => renderHook(() => useVerseOfTheDay(1), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create BibleClient with correct ApiClient config', () => {
      const wrapper = createYVWrapper();
      renderHook(() => useVerseOfTheDay(1), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({
        appKey: 'test-app-key',
      });
      expect(BibleClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize BibleClient instance', () => {
      const wrapper = createYVWrapper();
      const { result, rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper });
      const _firstRefetch = result.current.refetch;

      rerender();
      const _secondRefetch = result.current.refetch;

      expect(BibleClient).toHaveBeenCalledTimes(1);
    });

    it('should create new BibleClient when context values change', () => {
      let currentAppKey = 'test-app-key';

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          {children}
        </YouVersionContext.Provider>
      );

      const { rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      expect(BibleClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';
      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching VOTD', () => {
    it('should fetch VOTD for day 1', async () => {
      const wrapper = createYVWrapper();
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
      const wrapper = createYVWrapper();
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
      const wrapper = createYVWrapper();
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
      const wrapper = createYVWrapper();
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
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useVerseOfTheDay(1, { enabled: false }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVOTD).not.toHaveBeenCalled();
      expect.soft(result.current.data).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const wrapper = createYVWrapper();
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
      const wrapper = createYVWrapper();
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
