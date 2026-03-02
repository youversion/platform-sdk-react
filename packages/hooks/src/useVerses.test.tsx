/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach } from 'vitest';
import { it } from './test/hook-fixtures';
import { useVerses } from './useVerses';
import { type BibleClient, type BibleVerse, type Collection } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');

describe('useVerses', () => {
  const mockGetVerses = vi.fn();

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

    const mockClient: Partial<BibleClient> = { getVerses: mockGetVerses };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('fetching verses', () => {
    it('should fetch verses with all 3 parameters', async ({ wrapper }) => {
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
        initialArgs: [1, 'MAT', 1] as const,
        updatedArgs: [111, 'MAT', 1] as const,
      },
      {
        param: 'book',
        initialArgs: [1, 'MAT', 1] as const,
        updatedArgs: [1, 'GEN', 1] as const,
      },
      {
        param: 'chapter',
        initialArgs: [1, 'MAT', 1] as const,
        updatedArgs: [1, 'MAT', 5] as const,
      },
    ])('should refetch when $param changes', async ({ wrapper, initialArgs, updatedArgs }) => {
      const { result, rerender } = renderHook(({ args }) => useVerses(args[0], args[1], args[2]), {
        wrapper,
        initialProps: { args: initialArgs },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVerses).toHaveBeenLastCalledWith(...initialArgs);

      act(() => {
        rerender({ args: updatedArgs });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVerses).toHaveBeenLastCalledWith(...updatedArgs);
    });

    it('should not fetch when enabled is false', async ({ wrapper }) => {
      const { result } = renderHook(() => useVerses(1, 'MAT', 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVerses).not.toHaveBeenCalled();
      expect.soft(result.current.verses).toBe(null);
    });

    it('should handle fetch errors', async ({ wrapper }) => {
      const error = new Error('Failed to fetch verses');
      mockGetVerses.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.verses).toBe(null);
    });

    it('should support manual refetch', async ({ wrapper }) => {
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
