/* eslint-disable react-hooks/rules-of-hooks, @typescript-eslint/no-unsafe-assignment */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach } from 'vitest';
import { it } from './test/hook-fixtures';
import { useVerse } from './useVerse';
import { type BibleClient, type BibleVerse } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');

describe('useVerse', () => {
  const mockGetVerse = vi.fn();

  const mockVerse: BibleVerse = {
    id: '1',
    passage_id: 'MAT.1.1',
    title: '1',
  };

  beforeEach(() => {
    mockGetVerse.mockResolvedValue(mockVerse);

    const mockClient: Partial<BibleClient> = { getVerse: mockGetVerse };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('fetching verse', () => {
    it('should fetch verse with all 4 parameters', async ({ wrapper }) => {
      const { result } = renderHook(() => useVerse(111, 'MAT', 1, 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verse).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerse).toHaveBeenCalledWith(111, 'MAT', 1, 1);
      expect.soft(result.current.verse).toEqual(mockVerse);
    });

    it.each([
      {
        param: 'versionId',
        hookFn: ({ val }: { val: number | string }) => useVerse(val as number, 'MAT', 1, 1),
        initial: { val: 1 },
        updated: { val: 111 },
        expectedInitial: [1, 'MAT', 1, 1],
        expectedUpdated: [111, 'MAT', 1, 1],
      },
      {
        param: 'book',
        hookFn: ({ val }: { val: number | string }) => useVerse(1, val as string, 1, 1),
        initial: { val: 'MAT' },
        updated: { val: 'GEN' },
        expectedInitial: [1, 'MAT', 1, 1],
        expectedUpdated: [1, 'GEN', 1, 1],
      },
      {
        param: 'chapter',
        hookFn: ({ val }: { val: number | string }) => useVerse(1, 'MAT', val as number, 1),
        initial: { val: 1 },
        updated: { val: 5 },
        expectedInitial: [1, 'MAT', 1, 1],
        expectedUpdated: [1, 'MAT', 5, 1],
      },
      {
        param: 'verse',
        hookFn: ({ val }: { val: number | string }) => useVerse(1, 'MAT', 1, val as number),
        initial: { val: 1 },
        updated: { val: 10 },
        expectedInitial: [1, 'MAT', 1, 1],
        expectedUpdated: [1, 'MAT', 1, 10],
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

        expect.soft(mockGetVerse).toHaveBeenCalledTimes(1);
        expect.soft(mockGetVerse).toHaveBeenLastCalledWith(...expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetVerse).toHaveBeenCalledTimes(2);
        expect.soft(mockGetVerse).toHaveBeenLastCalledWith(...expectedUpdated);
      },
    );

    it('should not fetch when enabled is false', async ({ wrapper }) => {
      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerse).not.toHaveBeenCalled();
      expect.soft(result.current.verse).toBe(null);
    });

    it('should handle fetch errors', async ({ wrapper }) => {
      const error = new Error('Failed to fetch verse');
      mockGetVerse.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVerse(1, 'MAT', 1, 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.verse).toBe(null);
    });

    it('should support manual refetch', async ({ wrapper }) => {
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
