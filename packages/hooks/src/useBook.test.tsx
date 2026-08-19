import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useBook } from './useBook';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { createMockBook } from './__tests__/mocks/bibles';

describe('useBook', () => {
  const mockGetBook = vi.fn();
  const mockBook = createMockBook();
  const bibleClient = createBibleClientStub({ getBook: mockGetBook });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  beforeEach(() => {
    mockGetBook.mockResolvedValue(mockBook);
  });

  describe('fetching book', () => {
    it('should fetch book with versionId and book params', async () => {
      const { result } = renderHook(() => useBook(111, 'GEN'), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.book).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetBook).toHaveBeenCalledWith(111, 'GEN');
      expect.soft(result.current.book).toEqual(mockBook);
    });

    it.each([
      {
        param: 'versionId',
        initial: { versionId: 1, book: 'GEN' },
        updated: { versionId: 111, book: 'GEN' },
        expectedInitial: [1, 'GEN'],
        expectedUpdated: [111, 'GEN'],
      },
      {
        param: 'book',
        initial: { versionId: 1, book: 'GEN' },
        updated: { versionId: 1, book: 'EXO' },
        expectedInitial: [1, 'GEN'],
        expectedUpdated: [1, 'EXO'],
      },
    ])(
      'should refetch when $param changes',
      async ({ initial, updated, expectedInitial, expectedUpdated }) => {
        const { result, rerender } = renderHook(
          ({ versionId, book }: { versionId: number; book: string }) => useBook(versionId, book),
          {
            wrapper,
            initialProps: initial,
          },
        );

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetBook).toHaveBeenCalledTimes(1);
        expect.soft(mockGetBook).toHaveBeenLastCalledWith(...expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetBook).toHaveBeenCalledTimes(2);
        expect.soft(mockGetBook).toHaveBeenLastCalledWith(...expectedUpdated);
      },
    );

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useBook(1, 'GEN', { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetBook).not.toHaveBeenCalled();
      expect.soft(result.current.book).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch book');
      mockGetBook.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useBook(1, 'GEN'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.book).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch book');
      mockGetBook.mockRejectedValueOnce(error).mockResolvedValueOnce(mockBook);

      const { result } = renderHook(() => useBook(1, 'GEN'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.book).toBe(null);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toBe(null);
      expect.soft(result.current.book).toEqual(mockBook);
    });

    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useBook(1, 'GEN'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetBook).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetBook).toHaveBeenCalledTimes(2);
      });
    });
  });
});
