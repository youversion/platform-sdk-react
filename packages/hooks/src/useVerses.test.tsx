import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { useVerses } from './useVerses';
import { YouVersionContext } from './context';
import {
  BibleClient,
  ApiClient,
  type BibleVerse,
  type Collection,
} from '@youversion/platform-core';

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

describe('useVerses', () => {
  const mockAppKey = 'test-app-key';

  const mockVerses: Collection<BibleVerse> = {
    data: [
      { id: '1', passage_id: 'JHN.3.1', title: '1' },
      { id: '2', passage_id: 'JHN.3.2', title: '2' },
      { id: '3', passage_id: 'JHN.3.3', title: '3' },
    ],
    next_page_token: null,
  };

  let mockGetVerses: Mock;

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetVerses = vi.fn().mockResolvedValue(mockVerses);

    (BibleClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getVerses: mockGetVerses,
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
      expect(() => renderHook(() => useVerses(111, 'JHN', 3))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({ appKey: '' });

      expect(() => renderHook(() => useVerses(111, 'JHN', 3), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create BibleClient with correct ApiClient config', () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      renderHook(() => useVerses(111, 'JHN', 3), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({ appKey: mockAppKey });
      expect(BibleClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize BibleClient instance', () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { rerender } = renderHook(() => useVerses(111, 'JHN', 3), { wrapper });

      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(1);
    });

    it('should create new BibleClient when context values change', () => {
      let currentAppKey = mockAppKey;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider value={{ appKey: currentAppKey }}>
          {children}
        </YouVersionContext.Provider>
      );

      const { rerender } = renderHook(() => useVerses(111, 'JHN', 3), { wrapper });

      expect(BibleClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';
      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching verses', () => {
    it('should fetch verses with all 3 parameters', async () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerses(111, 'JHN', 3), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verses).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledWith(111, 'JHN', 3);
      expect(result.current.verses).toEqual(mockVerses);
    });

    it.each([
      {
        param: 'versionId',
        initial: { v: 111, b: 'JHN', c: 3 },
        changed: { v: 1, b: 'JHN', c: 3 },
      },
      { param: 'book', initial: { v: 111, b: 'JHN', c: 3 }, changed: { v: 111, b: 'MAT', c: 3 } },
      {
        param: 'chapter',
        initial: { v: 111, b: 'JHN', c: 3 },
        changed: { v: 111, b: 'JHN', c: 1 },
      },
    ])('should refetch when $param changes', async ({ initial, changed }) => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result, rerender } = renderHook(({ v, b, c }) => useVerses(v, b, c), {
        wrapper,
        initialProps: initial,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);

      rerender(changed);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(changed.v, changed.b, changed.c);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerses(111, 'JHN', 3, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).not.toHaveBeenCalled();
      expect(result.current.verses).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch verses');
      mockGetVerses.mockRejectedValueOnce(error);

      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerses(111, 'JHN', 3), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.verses).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerses(111, 'JHN', 3), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetVerses).toHaveBeenCalledTimes(2);
      });
    });
  });
});
