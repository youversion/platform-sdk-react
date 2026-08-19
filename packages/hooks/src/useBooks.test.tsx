import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useBooks } from './useBooks';
import { type BibleBook, type Collection } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { createMockBook } from './__tests__/mocks/bibles';

describe('useBooks', () => {
  const mockGetBooks = vi.fn();
  const bibleClient = createBibleClientStub({ getBooks: mockGetBooks });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockBooks: Collection<BibleBook> = {
    data: [
      createMockBook(),
      createMockBook({
        id: 'EXO',
        title: 'Exodus',
        full_title: 'The Second Book of Moses, Commonly Called Exodus',
        abbreviation: 'Exod',
      }),
    ],
    next_page_token: null,
  };

  beforeEach(() => {
    mockGetBooks.mockResolvedValue(mockBooks);
  });

  describe('fetching books', () => {
    it('should fetch all books for a version', async () => {
      const { result } = renderHook(() => useBooks(111), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.books).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetBooks).toHaveBeenCalledWith(111);
      expect.soft(result.current.books).toEqual(mockBooks);
    });

    it('should refetch when versionId changes', async () => {
      const { result, rerender } = renderHook(({ versionId }) => useBooks(versionId), {
        wrapper,
        initialProps: { versionId: 111 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetBooks).toHaveBeenCalledTimes(1);
      expect.soft(mockGetBooks).toHaveBeenLastCalledWith(111);

      rerender({ versionId: 1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetBooks).toHaveBeenCalledTimes(2);
      expect.soft(mockGetBooks).toHaveBeenLastCalledWith(1);
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useBooks(111, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetBooks).not.toHaveBeenCalled();
      expect.soft(result.current.books).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch books');
      mockGetBooks.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useBooks(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.books).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch books');
      mockGetBooks.mockRejectedValueOnce(error).mockResolvedValueOnce(mockBooks);

      const { result } = renderHook(() => useBooks(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.books).toBe(null);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toBe(null);
      expect.soft(result.current.books).toEqual(mockBooks);
    });

    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useBooks(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetBooks).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetBooks).toHaveBeenCalledTimes(2);
      });
    });
  });
});
