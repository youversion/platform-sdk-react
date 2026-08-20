import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useVersion } from './useVersion';
import { type BibleVersion } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper } from './test/utils';

describe('useVersion', () => {
  const mockGetVersion = vi.fn();
  const bibleClient = createBibleClientStub({ getVersion: mockGetVersion });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockVersion: BibleVersion = {
    id: 111,
    title: 'New International Version',
    abbreviation: 'NIV',
    localized_title: 'New International Version',
    localized_abbreviation: 'NIV',
    language_tag: 'en',
    books: ['GEN', 'EXO', 'LEV'],
    youversion_deep_link: 'https://bible.com/versions/111',
  };

  beforeEach(() => {
    mockGetVersion.mockResolvedValue(mockVersion);
  });

  describe('fetching version', () => {
    it('should fetch version by ID', async () => {
      const { result } = renderHook(() => useVersion(111), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.version).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).toHaveBeenCalledWith(111);
      expect.soft(result.current.version).toEqual(mockVersion);
    });

    it('should fetch different version by ID', async () => {
      const mockKJV: BibleVersion = {
        id: 1,
        title: 'King James Version',
        abbreviation: 'KJV',
        localized_title: 'King James Version',
        localized_abbreviation: 'KJV',
        language_tag: 'en',
        books: ['GEN', 'EXO', 'LEV'],
        youversion_deep_link: 'https://bible.com/versions/1',
      };
      mockGetVersion.mockResolvedValueOnce(mockKJV);

      const { result } = renderHook(() => useVersion(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).toHaveBeenCalledWith(1);
      expect.soft(result.current.version).toEqual(mockKJV);
    });
  });

  describe('refetch behavior', () => {
    it('should refetch when versionId changes', async () => {
      const { result, rerender } = renderHook(({ versionId }) => useVersion(versionId), {
        wrapper,
        initialProps: { versionId: 111 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersion).toHaveBeenNthCalledWith(1, 111);

      rerender({ versionId: 1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersion).toHaveBeenNthCalledWith(2, 1);
    });
  });

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useVersion(111, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).not.toHaveBeenCalled();
      expect.soft(result.current.version).toBe(null);
    });

    it('should fetch when enabled is true', async () => {
      const { result } = renderHook(() => useVersion(111, { enabled: true }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).toHaveBeenCalled();
      expect.soft(result.current.version).toEqual(mockVersion);
    });

    it('should fetch when enabled is not specified', async () => {
      const { result } = renderHook(() => useVersion(111), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersion).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch version');
      mockGetVersion.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVersion(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.version).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch version');
      mockGetVersion.mockRejectedValueOnce(error).mockResolvedValueOnce(mockVersion);

      const { result } = renderHook(() => useVersion(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
      });

      expect.soft(result.current.error).toBe(null);
      expect.soft(result.current.version).toEqual(mockVersion);
    });
  });

  describe('manual refetch', () => {
    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useVersion(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersion).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersion).toHaveBeenNthCalledWith(1, 111);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetVersion).toHaveBeenCalledTimes(2);
      });

      expect(mockGetVersion).toHaveBeenNthCalledWith(2, 111);
    });
  });
});
