import { renderHook, waitFor, act } from '@testing-library/react';
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

// Mock the core package
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
      { id: '1', passage_id: 'MAT.1.1', title: '1' },
      { id: '2', passage_id: 'MAT.1.2', title: '2' },
      { id: '3', passage_id: 'MAT.1.3', title: '3' },
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
      expect(() => renderHook(() => useVerses(1, 'MAT', 1))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({
        appKey: '',
      });

      expect(() => renderHook(() => useVerses(1, 'MAT', 1), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create BibleClient with correct ApiClient config', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({
        appKey: mockAppKey,
      });
      expect(BibleClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should memoize BibleClient instance', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(1);
    });

    it('should create new BibleClient when context values change', async () => {
      let currentAppKey = mockAppKey;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          {children}
        </YouVersionContext.Provider>
      );

      const { result, rerender } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      expect(BibleClient).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      currentAppKey = 'new-app-key';
      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('fetching verses', () => {
    it('should fetch verses with all 3 parameters', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(111, 'MAT', 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verses).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledWith(111, 'MAT', 1);
      expect(result.current.verses).toEqual(mockVerses);
    });

    it('should refetch when versionId changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ versionId }) => useVerses(versionId, 'MAT', 1), {
        wrapper,
        initialProps: { versionId: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 1);

      rerender({ versionId: 111 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(111, 'MAT', 1);
    });

    it('should refetch when book changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ book }) => useVerses(1, book, 1), {
        wrapper,
        initialProps: { book: 'MAT' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 1);

      rerender({ book: 'GEN' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'GEN', 1);
    });

    it('should refetch when chapter changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ chapter }) => useVerses(1, 'MAT', chapter), {
        wrapper,
        initialProps: { chapter: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 1);

      rerender({ chapter: 5 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 5);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(1, 'MAT', 1, { enabled: false }), {
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

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.verses).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetVerses).toHaveBeenCalledTimes(2);
      });
    });
  });
});
