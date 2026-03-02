import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach } from 'vitest';
import { it } from './test/hook-fixtures';
import { useLanguages } from './useLanguages';
import {
  type LanguagesClient,
  type Collection,
  type Language,
  type GetLanguagesOptions,
} from '@youversion/platform-core';
import { useLanguagesClient } from './useLanguageClient';

vi.mock('./useLanguageClient');

describe('useLanguages', () => {
  const mockGetLanguages = vi.fn();

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
        default_bible_id: 1,
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
        default_bible_id: 128,
      },
    ],
    next_page_token: null,
  };

  beforeEach(() => {
    mockGetLanguages.mockResolvedValue(mockLanguages);

    const mockClient: Partial<LanguagesClient> = { getLanguages: mockGetLanguages };
    vi.mocked(useLanguagesClient).mockReturnValue(mockClient as LanguagesClient);
  });

  describe('fetching languages', () => {
    it('should fetch languages without country filter', async ({ wrapper }) => {
      const { result } = renderHook(() => useLanguages(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.languages).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguages).toHaveBeenCalledWith({});
      expect.soft(result.current.languages).toEqual(mockLanguages);
    });

    it('should fetch languages with provided country', async ({ wrapper }) => {
      const { result } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.languages).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguages).toHaveBeenCalledWith({ country: 'US' });
      expect.soft(result.current.languages).toEqual(mockLanguages);
    });

    it('should fetch languages with all options', async ({ wrapper }) => {
      const options: GetLanguagesOptions = {
        country: 'US',
        page_size: 10,
        page_token: 'test_token',
      };

      const { result } = renderHook(() => useLanguages(options), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguages).toHaveBeenCalledWith(options);
      expect.soft(result.current.languages).toEqual(mockLanguages);
    });

    it('should refetch when options change', async ({ wrapper }) => {
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

      expect.soft(mockGetLanguages).toHaveBeenCalledTimes(2);
      expect.soft(mockGetLanguages).toHaveBeenLastCalledWith({ country: 'ES' });
    });

    it('should not fetch when enabled is false', async ({ wrapper }) => {
      const { result } = renderHook(() => useLanguages({ country: 'US' }, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguages).not.toHaveBeenCalled();
      expect.soft(result.current.languages).toBe(null);
    });

    it('should handle fetch errors', async ({ wrapper }) => {
      const error = new Error('Failed to fetch languages');
      mockGetLanguages.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.languages).toBe(null);
    });

    it('should support manual refetch', async ({ wrapper }) => {
      const { result } = renderHook(() => useLanguages({ country: 'US' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetLanguages).toHaveBeenCalledTimes(2);
      });
    });

    it('should fetch languages with fields filter', async ({ wrapper }) => {
      const options: GetLanguagesOptions = {
        fields: ['id', 'language', 'script'],
        page_size: '*',
      };

      const { result } = renderHook(() => useLanguages(options), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguages).toHaveBeenCalledWith(options);
      expect.soft(result.current.languages).toEqual(mockLanguages);
    });

    it('should refetch when fields change', async ({ wrapper }) => {
      const { result, rerender } = renderHook(({ options }) => useLanguages(options), {
        wrapper,
        initialProps: { options: { fields: ['id', 'language'] } as GetLanguagesOptions },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguages).toHaveBeenCalledTimes(1);

      rerender({ options: { fields: ['id', 'language', 'script'] } as GetLanguagesOptions });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguages).toHaveBeenCalledTimes(2);
      expect.soft(mockGetLanguages).toHaveBeenLastCalledWith({
        fields: ['id', 'language', 'script'],
      });
    });
  });
});
