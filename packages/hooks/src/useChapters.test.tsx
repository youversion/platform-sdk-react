import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useChapters } from './useChapters';
import { type BibleChapter, type Collection } from '@youversion/platform-core';
import { cacheEnvelope, createBibleClientStub, createYVWrapper } from './test/utils';

describe('useChapters', () => {
  const mockGetChapters = vi.fn();
  const bibleClient = createBibleClientStub({ readWithPolicy: mockGetChapters });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockChapters: Collection<BibleChapter> = {
    data: [
      { id: '1', passage_id: 'MAT.1.1', title: 'Matthew 1' },
      { id: '2', passage_id: 'MAT.1.2', title: 'Matthew 2' },
      { id: '3', passage_id: 'MAT.1.3', title: 'Matthew 3' },
    ],
    next_page_token: null,
  };

  beforeEach(() => {
    mockGetChapters.mockResolvedValue(cacheEnvelope(mockChapters));
  });

  describe('fetching chapters', () => {
    it('should fetch chapters with versionId, book params', async () => {
      const { result } = renderHook(() => useChapters(111, 'MAT'), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.chapters).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetChapters).toHaveBeenCalledWith({
        resource: 'chapters',
        versionId: 111,
        book: 'MAT',
      });
      expect.soft(result.current.chapters).toEqual(mockChapters);
    });

    it.each([
      {
        param: 'versionId',
        initial: { versionId: 1, book: 'MAT' },
        updated: { versionId: 111, book: 'MAT' },
        expectedInitial: { resource: 'chapters' as const, versionId: 1, book: 'MAT' },
        expectedUpdated: { resource: 'chapters' as const, versionId: 111, book: 'MAT' },
      },
      {
        param: 'book',
        initial: { versionId: 1, book: 'MAT' },
        updated: { versionId: 1, book: 'GEN' },
        expectedInitial: { resource: 'chapters' as const, versionId: 1, book: 'MAT' },
        expectedUpdated: { resource: 'chapters' as const, versionId: 1, book: 'GEN' },
      },
    ])(
      'should refetch when $param changes',
      async ({ initial, updated, expectedInitial, expectedUpdated }) => {
        type ChaptersArgs = { versionId: number; book: string };
        const { result, rerender } = renderHook(
          ({ versionId, book }: ChaptersArgs) => useChapters(versionId, book),
          {
            wrapper,
            initialProps: initial,
          },
        );

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetChapters).toHaveBeenCalledTimes(1);
        expect.soft(mockGetChapters).toHaveBeenLastCalledWith(expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetChapters).toHaveBeenCalledTimes(2);
        expect.soft(mockGetChapters).toHaveBeenLastCalledWith(expectedUpdated);
      },
    );

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useChapters(1, 'MAT', { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetChapters).not.toHaveBeenCalled();
      expect.soft(result.current.chapters).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch chapters');
      mockGetChapters.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChapters(1, 'MAT'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.chapters).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch chapters');
      mockGetChapters
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(cacheEnvelope(mockChapters));

      const { result } = renderHook(() => useChapters(1, 'MAT'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.chapters).toBe(null);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toBe(null);
      expect.soft(result.current.chapters).toEqual(mockChapters);
    });

    it('should support manual refetch', async () => {
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
    it.each([{ invalidBook: 'undefined' }, { invalidBook: 'null' }, { invalidBook: '' }])(
      'should skip fetch when book is "$invalidBook"',
      async ({ invalidBook }) => {
        const { result } = renderHook(() => useChapters(1, invalidBook), { wrapper });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetChapters).not.toHaveBeenCalled();
        expect.soft(result.current.chapters).toBe(null);
      },
    );

    it('should fetch when book changes from invalid to valid', async () => {
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

      expect.soft(mockGetChapters).toHaveBeenCalledTimes(1);
      expect.soft(mockGetChapters).toHaveBeenCalledWith({
        resource: 'chapters',
        versionId: 1,
        book: 'MAT',
      });
      expect.soft(result.current.chapters).toEqual(mockChapters);
    });
  });
});
