import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useVerse } from './useVerse';
import { type BibleVerse } from '@youversion/platform-core';
import { cacheEnvelope, createBibleClientStub, createYVWrapper } from './test/utils';

describe('useVerse', () => {
  const mockGetVerse = vi.fn();
  const bibleClient = createBibleClientStub({ readWithPolicy: mockGetVerse });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockVerse: BibleVerse = {
    id: '1',
    passage_id: 'MAT.1.1',
    title: '1',
  };

  beforeEach(() => {
    mockGetVerse.mockResolvedValue(cacheEnvelope(mockVerse));
  });

  describe('fetching verse', () => {
    it('should fetch verse with all 4 parameters', async () => {
      const { result } = renderHook(() => useVerse(111, 'MAT', 1, 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verse).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerse).toHaveBeenCalledWith({
        resource: 'verse',
        versionId: 111,
        book: 'MAT',
        chapter: 1,
        verse: 1,
      });
      expect.soft(result.current.verse).toEqual(mockVerse);
    });

    it.each([
      {
        param: 'versionId',
        initial: { versionId: 1, book: 'MAT', chapter: 1, verse: 1 },
        updated: { versionId: 111, book: 'MAT', chapter: 1, verse: 1 },
        expectedInitial: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'MAT',
          chapter: 1,
          verse: 1,
        },
        expectedUpdated: {
          resource: 'verse' as const,
          versionId: 111,
          book: 'MAT',
          chapter: 1,
          verse: 1,
        },
      },
      {
        param: 'book',
        initial: { versionId: 1, book: 'MAT', chapter: 1, verse: 1 },
        updated: { versionId: 1, book: 'GEN', chapter: 1, verse: 1 },
        expectedInitial: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'MAT',
          chapter: 1,
          verse: 1,
        },
        expectedUpdated: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'GEN',
          chapter: 1,
          verse: 1,
        },
      },
      {
        param: 'chapter',
        initial: { versionId: 1, book: 'MAT', chapter: 1, verse: 1 },
        updated: { versionId: 1, book: 'MAT', chapter: 5, verse: 1 },
        expectedInitial: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'MAT',
          chapter: 1,
          verse: 1,
        },
        expectedUpdated: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'MAT',
          chapter: 5,
          verse: 1,
        },
      },
      {
        param: 'verse',
        initial: { versionId: 1, book: 'MAT', chapter: 1, verse: 1 },
        updated: { versionId: 1, book: 'MAT', chapter: 1, verse: 10 },
        expectedInitial: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'MAT',
          chapter: 1,
          verse: 1,
        },
        expectedUpdated: {
          resource: 'verse' as const,
          versionId: 1,
          book: 'MAT',
          chapter: 1,
          verse: 10,
        },
      },
    ])(
      'should refetch when $param changes',
      async ({ initial, updated, expectedInitial, expectedUpdated }) => {
        type VerseArgs = { versionId: number; book: string; chapter: number; verse: number };
        const { result, rerender } = renderHook(
          ({ versionId, book, chapter, verse }: VerseArgs) =>
            useVerse(versionId, book, chapter, verse),
          {
            wrapper,
            initialProps: initial,
          },
        );

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetVerse).toHaveBeenCalledTimes(1);
        expect.soft(mockGetVerse).toHaveBeenLastCalledWith(expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetVerse).toHaveBeenCalledTimes(2);
        expect.soft(mockGetVerse).toHaveBeenLastCalledWith(expectedUpdated);
      },
    );

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerse).not.toHaveBeenCalled();
      expect.soft(result.current.verse).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch verse');
      mockGetVerse.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.verse).toBe(null);
    });

    it('should support manual refetch', async () => {
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
