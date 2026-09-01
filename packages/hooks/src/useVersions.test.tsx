import { render, renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useVersions, type UseVersionsResult } from './useVersions';
import { type Collection, type BibleVersion } from '@youversion/platform-core';
import { YouVersionContext } from './context';
import { createBibleClientStub, createYVWrapper, TestQueryClientProvider } from './test/utils';

describe('useVersions', () => {
  const mockGetVersions = vi.fn();
  const bibleClient = createBibleClientStub({ getVersions: mockGetVersions });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  const mockVersions: Collection<BibleVersion> = {
    data: [
      {
        id: 111,
        title: 'New International Version',
        abbreviation: 'NIV',
        localized_title: 'New International Version',
        localized_abbreviation: 'NIV',
        language_tag: 'en',
        books: ['GEN', 'EXO', 'LEV'],
        youversion_deep_link: 'https://bible.com/versions/111',
      },
      {
        id: 1,
        title: 'King James Version',
        abbreviation: 'KJV',
        localized_title: 'King James Version',
        localized_abbreviation: 'KJV',
        language_tag: 'en',
        books: ['GEN', 'EXO', 'LEV'],
        youversion_deep_link: 'https://bible.com/versions/1',
      },
    ],
    next_page_token: null,
  };

  beforeEach(() => {
    mockGetVersions.mockResolvedValue(mockVersions);
  });

  describe('fetching versions', () => {
    it('should fetch versions with default language range', async () => {
      const { result } = renderHook(() => useVersions(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.versions).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledWith('en', undefined, undefined);
      expect.soft(result.current.versions).toEqual(mockVersions);
    });

    it('should fetch versions with custom language range string', async () => {
      const { result } = renderHook(() => useVersions('es'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledWith('es', undefined, undefined);
      expect.soft(result.current.versions).toEqual(mockVersions);
    });

    it('should fetch versions with language range array', async () => {
      const { result } = renderHook(() => useVersions(['en', 'es', 'fr']), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledWith(['en', 'es', 'fr'], undefined, undefined);
      expect.soft(result.current.versions).toEqual(mockVersions);
    });

    it('should fetch versions with license ID', async () => {
      const { result } = renderHook(() => useVersions('en', 123), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledWith('en', 123, undefined);
      expect.soft(result.current.versions).toEqual(mockVersions);
    });

    it('should fetch versions with string license ID', async () => {
      const { result } = renderHook(() => useVersions('en', 'license-abc'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', 'license-abc', undefined);
    });
  });

  describe('fetching with options', () => {
    it('should fetch versions with page_size option', async () => {
      const { result } = renderHook(() => useVersions('en', undefined, { page_size: 10 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', undefined, {
        page_size: 10,
        page_token: undefined,
        fields: undefined,
        all_available: undefined,
      });
    });

    it('should fetch versions with page_size "*" and fields', async () => {
      const { result } = renderHook(
        () => useVersions('en', undefined, { page_size: '*', fields: ['id', 'abbreviation'] }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', undefined, {
        page_size: '*',
        page_token: undefined,
        fields: ['id', 'abbreviation'],
        all_available: undefined,
      });
    });

    it('should fetch versions with page_token option', async () => {
      const { result } = renderHook(
        () => useVersions('en', undefined, { page_token: 'next-page-token' }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', undefined, {
        page_size: undefined,
        page_token: 'next-page-token',
        fields: undefined,
        all_available: undefined,
      });
    });

    it('should fetch versions with fields option', async () => {
      const { result } = renderHook(
        () => useVersions('en', undefined, { fields: ['id', 'title', 'abbreviation'] }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', undefined, {
        page_size: undefined,
        page_token: undefined,
        fields: ['id', 'title', 'abbreviation'],
        all_available: undefined,
      });
    });

    it('should fetch versions with all_available option', async () => {
      const { result } = renderHook(() => useVersions('en', undefined, { all_available: true }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', undefined, {
        page_size: undefined,
        page_token: undefined,
        fields: undefined,
        all_available: true,
      });
    });

    it('should fetch versions with all options combined', async () => {
      const { result } = renderHook(
        () =>
          useVersions('en', 456, {
            page_size: 50,
            page_token: 'token-123',
            fields: ['id', 'title'],
            all_available: true,
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalledWith('en', 456, {
        page_size: 50,
        page_token: 'token-123',
        fields: ['id', 'title'],
        all_available: true,
      });
    });
  });

  describe('refetch behavior', () => {
    it('should refetch when languageRanges changes', async () => {
      const { result, rerender } = renderHook(({ lang }) => useVersions(lang), {
        wrapper,
        initialProps: { lang: 'en' satisfies string | string[] },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', undefined, undefined);

      rerender({ lang: 'es' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, 'es', undefined, undefined);
    });

    it('should refetch when languageRanges array changes', async () => {
      const { result, rerender } = renderHook(({ lang }) => useVersions(lang), {
        wrapper,
        initialProps: { lang: ['en', 'es'] satisfies string | string[] },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, ['en', 'es'], undefined, undefined);

      rerender({ lang: ['en', 'fr'] });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, ['en', 'fr'], undefined, undefined);
    });

    it('should refetch when licenseId changes', async () => {
      const { result, rerender } = renderHook(({ license }) => useVersions('en', license), {
        wrapper,
        initialProps: { license: 123 satisfies string | number | undefined },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', 123, undefined);

      rerender({ license: 456 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, 'en', 456, undefined);
    });

    it('should refetch when page_size changes', async () => {
      const { result, rerender } = renderHook(
        ({ options }) => useVersions('en', undefined, options),
        {
          wrapper,
          initialProps: { options: { page_size: 10 } },
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', undefined, {
        page_size: 10,
        page_token: undefined,
        fields: undefined,
        all_available: undefined,
      });

      rerender({ options: { page_size: 20 } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, 'en', undefined, {
        page_size: 20,
        page_token: undefined,
        fields: undefined,
        all_available: undefined,
      });
    });

    it('should refetch when page_token changes', async () => {
      const { result, rerender } = renderHook(
        ({ options }) => useVersions('en', undefined, options),
        {
          wrapper,
          initialProps: { options: { page_token: 'token-1' } },
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', undefined, {
        page_size: undefined,
        page_token: 'token-1',
        fields: undefined,
        all_available: undefined,
      });

      rerender({ options: { page_token: 'token-2' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, 'en', undefined, {
        page_size: undefined,
        page_token: 'token-2',
        fields: undefined,
        all_available: undefined,
      });
    });

    it('should refetch when fields changes', async () => {
      const initialFields: (keyof BibleVersion)[] = ['id'];
      const updatedFields: (keyof BibleVersion)[] = ['id', 'title'];
      const { result, rerender } = renderHook(
        ({ options }) => useVersions('en', undefined, options),
        {
          wrapper,
          initialProps: { options: { fields: initialFields } },
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', undefined, {
        page_size: undefined,
        page_token: undefined,
        fields: ['id'],
        all_available: undefined,
      });

      rerender({ options: { fields: updatedFields } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, 'en', undefined, {
        page_size: undefined,
        page_token: undefined,
        fields: ['id', 'title'],
        all_available: undefined,
      });
    });

    it('should refetch when all_available changes', async () => {
      const { result, rerender } = renderHook(
        ({ options }) => useVersions('en', undefined, options),
        {
          wrapper,
          initialProps: { options: { all_available: false } },
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', undefined, {
        page_size: undefined,
        page_token: undefined,
        fields: undefined,
        all_available: false,
      });

      rerender({ options: { all_available: true } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(2);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(2, 'en', undefined, {
        page_size: undefined,
        page_token: undefined,
        fields: undefined,
        all_available: true,
      });
    });
  });

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useVersions('en', undefined, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).not.toHaveBeenCalled();
      expect.soft(result.current.versions).toBe(null);
    });

    it('should fetch when enabled is true', async () => {
      const { result } = renderHook(() => useVersions('en', undefined, { enabled: true }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalled();
      expect.soft(result.current.versions).toEqual(mockVersions);
    });

    it('should fetch when enabled is not specified', async () => {
      const { result } = renderHook(() => useVersions('en', undefined, { page_size: 10 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVersions).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch versions');
      mockGetVersions.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useVersions('en'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.versions).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const error = new Error('Failed to fetch versions');
      mockGetVersions.mockRejectedValueOnce(error).mockResolvedValueOnce(mockVersions);

      const { result } = renderHook(() => useVersions('en'), { wrapper });

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
      expect.soft(result.current.versions).toEqual(mockVersions);
    });
  });

  describe('manual refetch', () => {
    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useVersions('en'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetVersions).toHaveBeenCalledTimes(1);
      expect.soft(mockGetVersions).toHaveBeenNthCalledWith(1, 'en', undefined, undefined);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetVersions).toHaveBeenCalledTimes(2);
      });

      expect(mockGetVersions).toHaveBeenNthCalledWith(2, 'en', undefined, undefined);
    });
  });

  it('refetches a remount in the same provider', async () => {
    const latest: { current: UseVersionsResult | null } = { current: null };
    function Probe() {
      latest.current = useVersions('en');
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
    expect(latest.current?.versions).toEqual(mockVersions);
    expect(mockGetVersions).toHaveBeenCalledTimes(1);

    rerender(<App mounted={false} />);
    rerender(<App mounted />);

    await waitFor(() => {
      expect(mockGetVersions).toHaveBeenCalledTimes(2);
    });
    expect(latest.current?.versions).toEqual(mockVersions);
  });
});
