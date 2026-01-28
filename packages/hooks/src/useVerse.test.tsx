import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { useVerse } from './useVerse';
import { YouVersionContext } from './context';
import { BibleClient, ApiClient, type BibleVerse } from '@youversion/platform-core';

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

describe('useVerse', () => {
  const mockAppKey = 'test-app-key';

  const mockVerse: BibleVerse = {
    id: '16',
    passage_id: 'JHN.3.16',
    title: '16',
  };

  let mockGetVerse: Mock;

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetVerse = vi.fn().mockResolvedValue(mockVerse);

    (BibleClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getVerse: mockGetVerse,
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
      expect(() => renderHook(() => useVerse(111, 'JHN', 3, 16))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({ appKey: '' });

      expect(() => renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create BibleClient with correct ApiClient config', () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({ appKey: mockAppKey });
      expect(BibleClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize BibleClient instance', () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { rerender } = renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper });

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

      const { rerender } = renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper });

      expect(BibleClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';
      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching verse', () => {
    it('should fetch verse with all 4 parameters', async () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verse).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledWith(111, 'JHN', 3, 16);
      expect(result.current.verse).toEqual(mockVerse);
    });

    it.each([
      {
        param: 'versionId',
        initial: { v: 111, b: 'JHN', c: 3, vs: 16 },
        changed: { v: 1, b: 'JHN', c: 3, vs: 16 },
      },
      {
        param: 'book',
        initial: { v: 111, b: 'JHN', c: 3, vs: 16 },
        changed: { v: 111, b: 'MAT', c: 3, vs: 16 },
      },
      {
        param: 'chapter',
        initial: { v: 111, b: 'JHN', c: 3, vs: 16 },
        changed: { v: 111, b: 'JHN', c: 1, vs: 16 },
      },
      {
        param: 'verse',
        initial: { v: 111, b: 'JHN', c: 3, vs: 16 },
        changed: { v: 111, b: 'JHN', c: 3, vs: 17 },
      },
    ])('should refetch when $param changes', async ({ initial, changed }) => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result, rerender } = renderHook(({ v, b, c, vs }) => useVerse(v, b, c, vs), {
        wrapper,
        initialProps: initial,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);

      rerender(changed);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(2);
      expect(mockGetVerse).toHaveBeenLastCalledWith(changed.v, changed.b, changed.c, changed.vs);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerse(111, 'JHN', 3, 16, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).not.toHaveBeenCalled();
      expect(result.current.verse).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch verse');
      mockGetVerse.mockRejectedValueOnce(error);

      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.verse).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({ appKey: mockAppKey });

      const { result } = renderHook(() => useVerse(111, 'JHN', 3, 16), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetVerse).toHaveBeenCalledTimes(2);
      });
    });
  });
});
