import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { useVerse } from './useVerse';
import { YouVersionContext } from './context';
import { BibleClient, ApiClient, type BibleVerse } from '@youversion/platform-core';

// Mock the core package
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');
});

describe('useVerse', () => {
  const mockAppKey = 'test-app-key';

  const mockVerse: BibleVerse = {
    id: '1',
    passage_id: 'MAT.1.1',
    title: '1',
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
      expect(() => renderHook(() => useVerse(1, 'MAT', 1, 1))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({
        appKey: '',
      });

      expect(() => renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create BibleClient with correct ApiClient config', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

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

      const { result, rerender } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

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

      const { result, rerender } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

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

  describe('fetching verse', () => {
    it('should fetch verse with all 4 parameters', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerse(111, 'MAT', 1, 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verse).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledWith(111, 'MAT', 1, 1);
      expect(result.current.verse).toEqual(mockVerse);
    });

    it('should refetch when versionId changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ versionId }) => useVerse(versionId, 'MAT', 1, 1), {
        wrapper,
        initialProps: { versionId: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'MAT', 1, 1);

      rerender({ versionId: 111 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(2);
      expect(mockGetVerse).toHaveBeenLastCalledWith(111, 'MAT', 1, 1);
    });

    it('should refetch when book changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ book }) => useVerse(1, book, 1, 1), {
        wrapper,
        initialProps: { book: 'MAT' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'MAT', 1, 1);

      rerender({ book: 'GEN' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(2);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'GEN', 1, 1);
    });

    it('should refetch when chapter changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ chapter }) => useVerse(1, 'MAT', chapter, 1), {
        wrapper,
        initialProps: { chapter: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'MAT', 1, 1);

      rerender({ chapter: 5 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(2);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'MAT', 5, 1);
    });

    it('should refetch when verse changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ verse }) => useVerse(1, 'MAT', 1, verse), {
        wrapper,
        initialProps: { verse: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'MAT', 1, 1);

      rerender({ verse: 10 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(2);
      expect(mockGetVerse).toHaveBeenLastCalledWith(1, 'MAT', 1, 10);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1, { enabled: false }), {
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

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.verse).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerse).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetVerse).toHaveBeenCalledTimes(2);
      });
    });
  });
});
