import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { useLanguages } from './useLanguages';
import { YouVersionContext } from './context';
import {
  LanguagesClient,
  ApiClient,
  type Collection,
  type Language,
  type GetLanguagesOptions,
} from '@youversion/platform-core';

// Mock the core package
vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    LanguagesClient: vi.fn(function () {
      return {};
    }),
    ApiClient: vi.fn(function () {
      return { isApiClient: true };
    }),
  };
});

describe('useLanguages', () => {
  const mockAppKey = 'test-app-key';

  const mockLanguages: Collection<Language> = {
    data: [
      {
        id: 'en',
        language: 'en',
        script: null,
        script_name: null,
        aliases: [],
        display_names: {
          en: 'English',
          es: 'Inglés',
        },
        scripts: ['Latn'],
        variants: [],
        countries: ['US'],
        text_direction: 'ltr',
        writing_population: 370000000,
        speaking_population: 1500000000,
        default_bible_version_id: 1,
      },
      {
        id: 'es',
        language: 'es',
        script: null,
        script_name: null,
        aliases: [],
        display_names: {
          en: 'Spanish',
          es: 'Español',
        },
        scripts: ['Latn'],
        variants: [],
        countries: ['ES'],
        text_direction: 'ltr',
        writing_population: 470000000,
        speaking_population: 580000000,
        default_bible_version_id: 128,
      },
    ],
    next_page_token: null,
  };

  let mockGetLanguages: Mock;

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetLanguages = vi.fn().mockResolvedValue(mockLanguages);

    (LanguagesClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getLanguages: mockGetLanguages,
      };
    });

    (ApiClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        isApiClient: true,
      };
    });
  });

  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useLanguages({ country: 'US' }))).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({
        appKey: '',
      });

      expect(() => renderHook(() => useLanguages({ country: 'US' }), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create LanguagesClient with correct ApiClient config', () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({
        appKey: mockAppKey,
      });
      expect(LanguagesClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize LanguagesClient instance', () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });
      const _firstRefetch = result.current.refetch;

      rerender();
      const _secondRefetch = result.current.refetch;

      expect(LanguagesClient).toHaveBeenCalledTimes(1);
    });

    it('should create new LanguagesClient when context values change', () => {
      let currentAppKey = mockAppKey;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          {children}
        </YouVersionContext.Provider>
      );

      const { rerender } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      expect(LanguagesClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';
      rerender();

      expect(LanguagesClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching languages', () => {
    it('should fetch languages without country filter', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useLanguages(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.languages).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledWith({});
      expect(result.current.languages).toEqual(mockLanguages);
    });

    it('should fetch languages with provided country', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.languages).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledWith({ country: 'US' });
      expect(result.current.languages).toEqual(mockLanguages);
    });

    it('should fetch languages with all options', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const options: GetLanguagesOptions = {
        country: 'US',
        page_size: 10,
        page_token: 'test_token',
      };

      const { result } = renderHook(() => useLanguages(options), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledWith(options);
      expect(result.current.languages).toEqual(mockLanguages);
    });

    it('should refetch when options change', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ options }) => useLanguages(options), {
        wrapper,
        initialProps: { options: { country: 'US' } },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledTimes(1);

      rerender({ options: { country: 'ES' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledTimes(2);
      expect(mockGetLanguages).toHaveBeenLastCalledWith({ country: 'ES' });
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useLanguages({ country: 'US' }, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).not.toHaveBeenCalled();
      expect(result.current.languages).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch languages');
      mockGetLanguages.mockRejectedValueOnce(error);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.languages).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetLanguages).toHaveBeenCalledTimes(2);
      });
    });
  });
});
