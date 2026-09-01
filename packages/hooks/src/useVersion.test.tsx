import { render, renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useVersion, type UseVersionResult } from './useVersion';
import { type BibleVersion } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import {
  cacheEnvelope,
  createBibleClientStub,
  createYVWrapper,
  TestQueryClientProvider,
} from './test/utils';

type VersionHookProbe = {
  current: UseVersionResult | null;
};

describe('useVersion', () => {
  const mockReadWithPolicy = vi.fn();
  const bibleClient = createBibleClientStub({ readWithPolicy: mockReadWithPolicy });
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
    mockReadWithPolicy.mockResolvedValue(cacheEnvelope(mockVersion));
  });

  describe('fetching version', () => {
    it('should fetch version by ID', async () => {
      const { result } = renderHook(() => useVersion(111), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.version).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockReadWithPolicy).toHaveBeenCalledWith({ resource: 'version', id: 111 });
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
      mockReadWithPolicy.mockResolvedValueOnce(cacheEnvelope(mockKJV));

      const { result } = renderHook(() => useVersion(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockReadWithPolicy).toHaveBeenCalledWith({ resource: 'version', id: 1 });
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

      expect.soft(mockReadWithPolicy).toHaveBeenCalledTimes(1);
      expect.soft(mockReadWithPolicy).toHaveBeenNthCalledWith(1, { resource: 'version', id: 111 });

      rerender({ versionId: 1 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockReadWithPolicy).toHaveBeenCalledTimes(2);
      expect.soft(mockReadWithPolicy).toHaveBeenNthCalledWith(2, { resource: 'version', id: 1 });
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

      expect.soft(mockReadWithPolicy).not.toHaveBeenCalled();
      expect.soft(result.current.version).toBe(null);
    });

    it('should fetch when enabled is true', async () => {
      const { result } = renderHook(() => useVersion(111, { enabled: true }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockReadWithPolicy).toHaveBeenCalled();
      expect.soft(result.current.version).toEqual(mockVersion);
    });

    it('should fetch when enabled is not specified', async () => {
      const { result } = renderHook(() => useVersion(111), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockReadWithPolicy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch version');
      mockReadWithPolicy.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVersion(111), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.version).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch version');
      mockReadWithPolicy
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(cacheEnvelope(mockVersion));

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

      expect.soft(mockReadWithPolicy).toHaveBeenCalledTimes(1);
      expect.soft(mockReadWithPolicy).toHaveBeenNthCalledWith(1, { resource: 'version', id: 111 });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockReadWithPolicy).toHaveBeenCalledTimes(2);
      });

      expect(mockReadWithPolicy).toHaveBeenNthCalledWith(2, { resource: 'version', id: 111 });
    });
  });

  it('does not refetch a remount while Cache-Control lifetime remains', async () => {
    mockReadWithPolicy.mockResolvedValue(cacheEnvelope(mockVersion, 60_000));

    const latest: VersionHookProbe = { current: null };
    function Probe() {
      latest.current = useVersion(111);
      return null;
    }
    function App({ mounted }: { mounted: boolean }) {
      return (
        <YouVersionContext.Provider value={{ appKey: 'test-app-key', bibleClient }}>
          <TestQueryClientProvider>{mounted ? <Probe /> : null}</TestQueryClientProvider>
        </YouVersionContext.Provider>
      );
    }

    const { rerender } = render(<App mounted />);
    await waitFor(() => {
      expect(latest.current?.loading).toBe(false);
    });
    expect(latest.current?.version).toEqual(mockVersion);
    expect(mockReadWithPolicy).toHaveBeenCalledTimes(1);
    expect(mockReadWithPolicy).toHaveBeenCalledWith({ resource: 'version', id: 111 });

    rerender(<App mounted={false} />);
    rerender(<App mounted />);

    await waitFor(() => {
      expect(latest.current?.loading).toBe(false);
    });
    expect(latest.current?.version).toEqual(mockVersion);
    expect(mockReadWithPolicy).toHaveBeenCalledTimes(1);
  });
});
