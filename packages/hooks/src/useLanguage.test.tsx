import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLanguage } from './useLanguage';
import * as core from '@youversion/platform-core';
import type { Language } from '@youversion/platform-core';
import { createLanguagesClientStub, createYVWrapper } from './test/utils';

describe('useLanguage', () => {
  const mockGetLanguage = vi.fn();
  const languagesClient = createLanguagesClientStub({ getLanguage: mockGetLanguage });
  const wrapper = createYVWrapper('test-app-key', { languagesClient });

  const mockLanguage: Language = {
    id: 'en',
    language: 'en',
    script: 'Latn',
    script_name: 'Latin',
    aliases: ['eng'],
    display_names: { en: 'English' },
    scripts: ['Latn'],
    variants: [],
    countries: ['US', 'GB', 'CA', 'AU'],
    text_direction: 'ltr',
    writing_population: 1500000000,
    speaking_population: 1500000000,
    default_bible_id: 111,
  };

  beforeEach(() => {
    mockGetLanguage.mockResolvedValue(mockLanguage);
  });

  describe('fetching language', () => {
    it('should fetch a language by id', async () => {
      const { result } = renderHook(() => useLanguage('en'), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.language).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguage).toHaveBeenCalledWith('en');
      expect.soft(result.current.language).toEqual(mockLanguage);
    });

    it('fetches via getLanguage when the provider has no languagesClient override', async () => {
      const spy = vi.spyOn(core, 'getLanguage').mockResolvedValue(mockLanguage);
      const bare = createYVWrapper('test-app-key');
      const { result } = renderHook(() => useLanguage('en'), { wrapper: bare });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(spy).toHaveBeenCalled();
      expect(result.current.language).toEqual(mockLanguage);
      spy.mockRestore();
    });

    it('should refetch when languageId changes', async () => {
      const { result, rerender } = renderHook(({ languageId }) => useLanguage(languageId), {
        wrapper,
        initialProps: { languageId: 'en' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguage).toHaveBeenCalledTimes(1);
      expect.soft(mockGetLanguage).toHaveBeenCalledWith('en');

      rerender({ languageId: 'es' });

      await waitFor(() => {
        expect(mockGetLanguage).toHaveBeenCalledTimes(2);
      });

      expect(mockGetLanguage).toHaveBeenLastCalledWith('es');
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useLanguage('en', { enabled: false }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetLanguage).not.toHaveBeenCalled();
      expect.soft(result.current.language).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch language');
      mockGetLanguage.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLanguage('en'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.language).toBe(null);
    });

    it('should support manual refetch', async () => {
      const { result } = renderHook(() => useLanguage('en'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetLanguage).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetLanguage).toHaveBeenCalledTimes(2);
      });
    });
  });
});
