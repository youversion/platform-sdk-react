import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useVerses } from './useVerses';
import { YouVersionContext } from './context';
import { type BibleClient, type BibleVerse, type Collection } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';

vi.mock('./useBibleClient');

describe('useVerses', () => {
  const mockAppKey = 'test-app-key';
  const mockGetVerses = vi.fn();

  const mockVerses: Collection<BibleVerse> = {
    data: [
      { id: '1', passage_id: 'MAT.1.1', title: '1' },
      { id: '2', passage_id: 'MAT.1.2', title: '2' },
      { id: '3', passage_id: 'MAT.1.3', title: '3' },
    ],
    next_page_token: null,
  };

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetVerses.mockResolvedValue(mockVerses);

    const mockClient: Partial<BibleClient> = { getVerses: mockGetVerses };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('fetching verses', () => {
    it('should fetch verses with all 3 parameters', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(111, 'MAT', 1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.verses).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledWith(111, 'MAT', 1);
      expect(result.current.verses).toEqual(mockVerses);
    });

    it('should refetch when versionId changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ versionId }) => useVerses(versionId, 'MAT', 1), {
        wrapper,
        initialProps: { versionId: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 1);

      act(() => {
        rerender({ versionId: 111 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(111, 'MAT', 1);
    });

    it('should refetch when book changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ book }) => useVerses(1, book, 1), {
        wrapper,
        initialProps: { book: 'MAT' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 1);

      act(() => {
        rerender({ book: 'GEN' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'GEN', 1);
    });

    it('should refetch when chapter changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ chapter }) => useVerses(1, 'MAT', chapter), {
        wrapper,
        initialProps: { chapter: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(1);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 1);

      act(() => {
        rerender({ chapter: 5 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).toHaveBeenCalledTimes(2);
      expect(mockGetVerses).toHaveBeenLastCalledWith(1, 'MAT', 5);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(1, 'MAT', 1, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVerses).not.toHaveBeenCalled();
      expect(result.current.verses).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch verses');
      mockGetVerses.mockRejectedValueOnce(error);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerses(1, 'MAT', 1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.verses).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

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
