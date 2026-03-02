/* eslint-disable react-hooks/rules-of-hooks, @typescript-eslint/no-unsafe-assignment */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach } from 'vitest';
import { it } from './test/hook-fixtures';
import { useChapter } from './useChapter';
import { type BibleClient, type BibleChapter } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');

describe('useChapter', () => {
  const mockGetChapter = vi.fn();

  const mockChapter: BibleChapter = {
    id: '1',
    passage_id: 'MAT.1',
    title: 'Matthew 1',
  };

  beforeEach(() => {
    mockGetChapter.mockResolvedValue(mockChapter);

    const mockClient: Partial<BibleClient> = { getChapter: mockGetChapter };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('fetching chapter', () => {
    it('should fetch chapter with versionId, book, chapter params', async ({ wrapper }) => {
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
        hookFn: ({ val }: { val: number | string }) => useChapter(val as number, 'MAT', 1),
        initial: { val: 1 },
        updated: { val: 111 },
        expectedInitial: [1, 'MAT', 1],
        expectedUpdated: [111, 'MAT', 1],
      },
      {
        param: 'book',
        hookFn: ({ val }: { val: number | string }) => useChapter(1, val as string, 1),
        initial: { val: 'MAT' },
        updated: { val: 'GEN' },
        expectedInitial: [1, 'MAT', 1],
        expectedUpdated: [1, 'GEN', 1],
      },
      {
        param: 'chapter',
        hookFn: ({ val }: { val: number | string }) => useChapter(1, 'MAT', val as number),
        initial: { val: 1 },
        updated: { val: 5 },
        expectedInitial: [1, 'MAT', 1],
        expectedUpdated: [1, 'MAT', 5],
      },
    ])(
      'should refetch when $param changes',
      async ({ hookFn, initial, updated, expectedInitial, expectedUpdated, wrapper }) => {
        const { result, rerender } = renderHook(hookFn, {
          wrapper,
          initialProps: initial,
        });

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

    it('should not fetch when enabled is false', async ({ wrapper }) => {
      const { result } = renderHook(() => useChapter(1, 'MAT', 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetChapter).not.toHaveBeenCalled();
      expect.soft(result.current.chapter).toBe(null);
    });

    it('should handle fetch errors', async ({ wrapper }) => {
      const error = new Error('Failed to fetch chapter');
      mockGetChapter.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChapter(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.chapter).toBe(null);
    });

    it('should clear error on successful refetch', async ({ wrapper }) => {
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

    it('should support manual refetch', async ({ wrapper }) => {
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
