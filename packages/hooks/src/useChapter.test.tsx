import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useChapter } from './useChapter';
import { type BibleChapter } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper } from './test/utils';

describe('useChapter', () => {
  const mockGetChapter = vi.fn();
  const bibleClient = createBibleClientStub({ getChapter: mockGetChapter });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockChapter: BibleChapter = {
    id: '1',
    passage_id: 'MAT.1',
    title: 'Matthew 1',
  };

  beforeEach(() => {
    mockGetChapter.mockResolvedValue(mockChapter);
  });

  describe('fetching chapter', () => {
    it('should fetch chapter with versionId, book, chapter params', async () => {
      const { result } = renderHook(() => useChapter(111, 'MAT', 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.chapter).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetChapter).toHaveBeenCalledWith(111, 'MAT', 1);
      expect.soft(result.current.chapter).toEqual(mockChapter);
    });

    it.each([
      {
        param: 'versionId',
        initial: { versionId: 1, book: 'MAT', chapter: 1 },
        updated: { versionId: 111, book: 'MAT', chapter: 1 },
        expectedInitial: [1, 'MAT', 1],
        expectedUpdated: [111, 'MAT', 1],
      },
      {
        param: 'book',
        initial: { versionId: 1, book: 'MAT', chapter: 1 },
        updated: { versionId: 1, book: 'GEN', chapter: 1 },
        expectedInitial: [1, 'MAT', 1],
        expectedUpdated: [1, 'GEN', 1],
      },
      {
        param: 'chapter',
        initial: { versionId: 1, book: 'MAT', chapter: 1 },
        updated: { versionId: 1, book: 'MAT', chapter: 5 },
        expectedInitial: [1, 'MAT', 1],
        expectedUpdated: [1, 'MAT', 5],
      },
    ])(
      'should refetch when $param changes',
      async ({ initial, updated, expectedInitial, expectedUpdated }) => {
        type ChapterArgs = { versionId: number; book: string; chapter: number };
        const { result, rerender } = renderHook(
          ({ versionId, book, chapter }: ChapterArgs) => useChapter(versionId, book, chapter),
          {
            wrapper,
            initialProps: initial,
          },
        );

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetChapter).toHaveBeenCalledTimes(1);
        expect.soft(mockGetChapter).toHaveBeenLastCalledWith(...expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetChapter).toHaveBeenCalledTimes(2);
        expect.soft(mockGetChapter).toHaveBeenLastCalledWith(...expectedUpdated);
      },
    );

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useChapter(1, 'MAT', 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetChapter).not.toHaveBeenCalled();
      expect.soft(result.current.chapter).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch chapter');
      mockGetChapter.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChapter(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.chapter).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch chapter');
      mockGetChapter.mockRejectedValueOnce(error).mockResolvedValueOnce(mockChapter);

      const { result } = renderHook(() => useChapter(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.chapter).toBe(null);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toBe(null);
      expect.soft(result.current.chapter).toEqual(mockChapter);
    });

    it('should support manual refetch', async () => {
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
