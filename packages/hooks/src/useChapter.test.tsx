import { render, renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useChapter, type UseChapterResult } from './useChapter';
import { YouVersionContext } from './context';
import { type BibleChapter } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper, TestQueryClientProvider } from './test/utils';

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

  it('should serve the cached chapter instantly on revisit and revalidate in background', async () => {
    // The acceptance criterion behind the TanStack Query migration: leaving
    // a chapter and coming back renders it from cache with no loading
    // flash, while a background refetch keeps it fresh. The provider stack
    // stays mounted across the visit (as in an app); only the hook-bearing
    // component unmounts.
    const results: UseChapterResult[] = [];
    function Probe() {
      results.push(useChapter(111, 'MAT', 1));
      return null;
    }
    function Harness({ show }: { show: boolean }) {
      return (
        <YouVersionContext.Provider value={{ appKey: 'test-app-key', bibleClient }}>
          <TestQueryClientProvider>{show ? <Probe /> : null}</TestQueryClientProvider>
        </YouVersionContext.Provider>
      );
    }

    const { rerender } = render(<Harness show />);
    await waitFor(() => {
      expect(results.at(-1)?.loading).toBe(false);
    });
    expect(mockGetChapter).toHaveBeenCalledTimes(1);

    // Navigate away…
    rerender(<Harness show={false} />);
    const rendersBeforeRevisit = results.length;

    // …and back: the very first render already has the chapter, no loading.
    rerender(<Harness show />);
    const firstRevisitRender = results[rendersBeforeRevisit];
    expect(firstRevisitRender?.chapter).toEqual(mockChapter);
    expect(firstRevisitRender?.loading).toBe(false);

    // Background revalidation still goes out.
    await waitFor(() => {
      expect(mockGetChapter).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the current chapter visible, with loading true, while the next chapter fetches', async () => {
    // The reader's next-chapter treatment (dim the current chapter, overlay
    // a spinner) keys on `loading && chapter !== null` — so a chapter
    // change must not blank `chapter` while the fetch is in flight.
    const nextChapter: BibleChapter = {
      id: '2',
      passage_id: 'MAT.2',
      title: 'Matthew 2',
    };
    const deferred = Promise.withResolvers<BibleChapter>();
    mockGetChapter.mockResolvedValueOnce(mockChapter).mockReturnValueOnce(deferred.promise);

    const { result, rerender } = renderHook(
      ({ chapter }: { chapter: number }) => useChapter(111, 'MAT', chapter),
      { wrapper, initialProps: { chapter: 1 } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.chapter).toEqual(mockChapter);

    act(() => {
      rerender({ chapter: 2 });
    });
    expect(result.current.chapter).toEqual(mockChapter);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      deferred.resolve(nextChapter);
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.chapter).toEqual(nextChapter);
  });
});
