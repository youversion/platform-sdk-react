import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useChapters } from './useChapters';
import { YouVersionContext } from './context';
import { type BibleClient, type BibleChapter, type Collection } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');

describe('useChapters', () => {
  const mockAppKey = 'test-app-key';
  const mockGetChapters = vi.fn();

  const mockChapters: Collection<BibleChapter> = {
    data: [
      { id: '1', passage_id: 'MAT.1.1', title: 'Matthew 1' },
      { id: '2', passage_id: 'MAT.1.2', title: 'Matthew 2' },
      { id: '3', passage_id: 'MAT.1.3', title: 'Matthew 3' },
    ],
    next_page_token: null,
  };

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetChapters.mockResolvedValue(mockChapters);

    const mockClient: Partial<BibleClient> = { getChapters: mockGetChapters };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('fetching chapters', () => {
    it('should fetch chapters with versionId, book params', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(111, 'MAT'), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.chapters).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledWith(111, 'MAT');
      expect(result.current.chapters).toEqual(mockChapters);
    });

    it('should refetch when versionId changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ versionId }) => useChapters(versionId, 'MAT'), {
        wrapper,
        initialProps: { versionId: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledTimes(1);
      expect(mockGetChapters).toHaveBeenLastCalledWith(1, 'MAT');

      act(() => {
        rerender({ versionId: 111 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledTimes(2);
      expect(mockGetChapters).toHaveBeenLastCalledWith(111, 'MAT');
    });

    it('should refetch when book changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ book }) => useChapters(1, book), {
        wrapper,
        initialProps: { book: 'MAT' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledTimes(1);
      expect(mockGetChapters).toHaveBeenLastCalledWith(1, 'MAT');

      act(() => {
        rerender({ book: 'GEN' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledTimes(2);
      expect(mockGetChapters).toHaveBeenLastCalledWith(1, 'GEN');
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, 'MAT', { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).not.toHaveBeenCalled();
      expect(result.current.chapters).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch chapters');
      mockGetChapters.mockRejectedValueOnce(error);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, 'MAT'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.chapters).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch chapters');
      mockGetChapters.mockRejectedValueOnce(error).mockResolvedValueOnce(mockChapters);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, 'MAT'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.chapters).toBe(null);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.chapters).toEqual(mockChapters);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, 'MAT'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetChapters).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('book validation', () => {
    it('should skip fetch when book is "undefined" string', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, 'undefined'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).not.toHaveBeenCalled();
      expect(result.current.chapters).toBe(null);
    });

    it('should skip fetch when book is "null" string', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, 'null'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).not.toHaveBeenCalled();
      expect(result.current.chapters).toBe(null);
    });

    it('should skip fetch when book is empty string', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapters(1, ''), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).not.toHaveBeenCalled();
      expect(result.current.chapters).toBe(null);
    });

    it('should fetch when book changes from invalid to valid', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ book }) => useChapters(1, book), {
        wrapper,
        initialProps: { book: 'undefined' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).not.toHaveBeenCalled();

      act(() => {
        rerender({ book: 'MAT' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapters).toHaveBeenCalledTimes(1);
      expect(mockGetChapters).toHaveBeenCalledWith(1, 'MAT');
      expect(result.current.chapters).toEqual(mockChapters);
    });
  });
});
