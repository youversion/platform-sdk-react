import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useVerses } from './useVerses';
import { type BibleVerse, type Collection } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper } from './test/utils';

describe('useVerses', () => {
  const mockGetVerses = vi.fn();
  const bibleClient = createBibleClientStub({ getVersesWithPolicy: mockGetVerses });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockVerses: Collection<BibleVerse> = {
    data: [
      { id: '1', passage_id: 'MAT.1.1', title: '1' },
      { id: '2', passage_id: 'MAT.1.2', title: '2' },
      { id: '3', passage_id: 'MAT.1.3', title: '3' },
    ],
    next_page_token: null,
  };

  beforeEach(() => {
    mockGetVerses.mockResolvedValue(mockVerses);
  });

  describe('fetching verses', () => {
    it('should fetch verses with all 3 parameters', async () => {
      const { result } = renderHook(() => useVerses(111, 'MAT', 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verses).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).toHaveBeenCalledWith(111, 'MAT', 1);
      expect.soft(result.current.verses).toEqual(mockVerses);
    });

    it.each([
      {
        param: 'versionId',
        initialArgs: { versionId: 1, book: 'MAT', chapter: 1 },
        updatedArgs: { versionId: 111, book: 'MAT', chapter: 1 },
      },
      {
        param: 'book',
        initialArgs: { versionId: 1, book: 'MAT', chapter: 1 },
        updatedArgs: { versionId: 1, book: 'GEN', chapter: 1 },
      },
      {
        param: 'chapter',
        initialArgs: { versionId: 1, book: 'MAT', chapter: 1 },
        updatedArgs: { versionId: 1, book: 'MAT', chapter: 5 },
      },
    ])('should refetch when $param changes', async ({ initialArgs, updatedArgs }) => {
      type VerseArgs = { versionId: number; book: string; chapter: number };
      const { result, rerender } = renderHook(
        ({ versionId, book, chapter }: VerseArgs) => useVerses(versionId, book, chapter),
        {
          wrapper,
          initialProps: initialArgs,
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).toHaveBeenCalledTimes(1);
      expect
        .soft(mockGetVerses)
        .toHaveBeenLastCalledWith(initialArgs.versionId, initialArgs.book, initialArgs.chapter);

      act(() => {
        rerender(updatedArgs);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).toHaveBeenCalledTimes(2);
      expect
        .soft(mockGetVerses)
        .toHaveBeenLastCalledWith(updatedArgs.versionId, updatedArgs.book, updatedArgs.chapter);
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useVerses(1, 'MAT', 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).not.toHaveBeenCalled();
      expect.soft(result.current.verses).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch verses');
      mockGetVerses.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.verses).toBe(null);
    });

    it('should support manual refetch', async () => {
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
