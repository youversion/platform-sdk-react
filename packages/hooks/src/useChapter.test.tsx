import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useChapter } from './useChapter';
import { YouVersionContext } from './context';
import { type BibleClient, type BibleChapter } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');

describe('useChapter', () => {
  const mockAppKey = 'test-app-key';
  const mockGetChapter = vi.fn();

  const mockChapter: BibleChapter = {
    id: '1',
    book_id: 'MAT',
    chapter: 1,
    title: 'Matthew 1',
  };

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetChapter.mockResolvedValue(mockChapter);

    const mockClient: Partial<BibleClient> = { getChapter: mockGetChapter };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('fetching chapter', () => {
    it('should fetch chapter with versionId, book, chapter params', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapter(111, 'MAT', 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.chapter).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledWith(111, 'MAT', 1);
      expect(result.current.chapter).toEqual(mockChapter);
    });

    it('should refetch when versionId changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ versionId }) => useChapter(versionId, 'MAT', 1), {
        wrapper,
        initialProps: { versionId: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(1);
      expect(mockGetChapter).toHaveBeenLastCalledWith(1, 'MAT', 1);

      act(() => {
        rerender({ versionId: 111 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(2);
      expect(mockGetChapter).toHaveBeenLastCalledWith(111, 'MAT', 1);
    });

    it('should refetch when book changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ book }) => useChapter(1, book, 1), {
        wrapper,
        initialProps: { book: 'MAT' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(1);
      expect(mockGetChapter).toHaveBeenLastCalledWith(1, 'MAT', 1);

      act(() => {
        rerender({ book: 'GEN' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(2);
      expect(mockGetChapter).toHaveBeenLastCalledWith(1, 'GEN', 1);
    });

    it('should refetch when chapter changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ chapter }) => useChapter(1, 'MAT', chapter), {
        wrapper,
        initialProps: { chapter: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(1);
      expect(mockGetChapter).toHaveBeenLastCalledWith(1, 'MAT', 1);

      act(() => {
        rerender({ chapter: 5 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(2);
      expect(mockGetChapter).toHaveBeenLastCalledWith(1, 'MAT', 5);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapter(1, 'MAT', 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).not.toHaveBeenCalled();
      expect(result.current.chapter).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch chapter');
      mockGetChapter.mockRejectedValueOnce(error);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapter(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.chapter).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useChapter(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetChapter).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetChapter).toHaveBeenCalledTimes(2);
      });
    });
  });
});
