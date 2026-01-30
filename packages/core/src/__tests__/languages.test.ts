import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../client';
import { LanguagesClient } from '../languages';
import { LanguageSchema } from '../schemas';

describe('LanguagesClient', () => {
  let apiClient: ApiClient;
  let languagesClient: LanguagesClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      apiHost: process.env.YVP_API_HOST || '',
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    });
    languagesClient = new LanguagesClient(apiClient);
  });

  describe('getLanguages', () => {
    it('should fetch languages without country filter', async () => {
      const languages = await languagesClient.getLanguages({ page_size: 99 });

      const { success } = LanguageSchema.safeParse(languages.data[0]);
      expect(success).toBe(true);
      expect(languages.data).toHaveLength(99);
      expect(languages.next_page_token).not.toBeNull();
    });

    it('should fetch languages with country filter', async () => {
      const languages = await languagesClient.getLanguages({ country: 'US', page_size: 20 });

      const { success } = LanguageSchema.safeParse(languages.data[0]);
      expect(success).toBe(true);
      expect(languages.data).toHaveLength(20);
      /** This is not true, it will always return the number provided in page_size
       *  and it will put the ones that have the country in their countries array
       *  at the top of the list.
       */
      // expect(languages.data.every((language) => language.countries?.includes('US'))).toBe(true);
      expect(languages.next_page_token).not.toBeNull();
    });

    it('should throw an error for invalid country code - empty string', async () => {
      await expect(languagesClient.getLanguages({ country: '' })).rejects.toThrow(
        'Country code must be a 2-character ISO 3166-1 alpha-2 code',
      );
    });

    it('should throw an error for invalid country code - wrong length', async () => {
      await expect(languagesClient.getLanguages({ country: 'USA' })).rejects.toThrow(
        'Country code must be a 2-character ISO 3166-1 alpha-2 code',
      );
      await expect(languagesClient.getLanguages({ country: 'U' })).rejects.toThrow(
        'Country code must be a 2-character ISO 3166-1 alpha-2 code',
      );
    });

    it('should throw an error for invalid country code - whitespace', async () => {
      await expect(languagesClient.getLanguages({ country: '  ' })).rejects.toThrow(
        'Country code must be a 2-character ISO 3166-1 alpha-2 code',
      );
    });

    it('should normalize lowercase country codes to uppercase', async () => {
      const getSpy = vi.spyOn(apiClient, 'get');

      await languagesClient.getLanguages({ country: 'us', page_size: 5 });

      expect(getSpy).toHaveBeenCalledWith(
        '/v1/languages',
        expect.objectContaining({ country: 'US' }),
      );
      getSpy.mockRestore();
    });

    it('should fetch languages with valid fields filter', async () => {
      const languages = await languagesClient.getLanguages({
        fields: ['id', 'language', 'script'],
        page_size: 10,
      });

      expect(languages.data).toHaveLength(10);
    });

    it('should throw an error for invalid field name', async () => {
      await expect(
        languagesClient.getLanguages({
          // @ts-expect-error - testing invalid field name
          fields: ['id', 'invalid_field'],
        }),
      ).rejects.toThrow();
    });

    it('should return all languages with no pagination when page_size="*" and fields are valid', async () => {
      const languages = await languagesClient.getLanguages({
        fields: ['id', 'language'],
        page_size: '*',
      });

      // page_size="*" should return all results with no next page token
      expect(languages.next_page_token).toBeNull();
      // Should return more than the default page size (25)
      expect(languages.data.length).toBeGreaterThan(25);
      // Should equal total_size since we're fetching all
      expect(languages.data.length).toBe(languages.total_size);
    });

    it('should throw an error for page_size="*" without fields', async () => {
      await expect(
        languagesClient.getLanguages({
          page_size: '*',
        }),
      ).rejects.toThrow('page_size="*" requires 1-3 fields to be specified');
    });

    it('should throw an error for page_size="*" with empty fields array', async () => {
      await expect(
        languagesClient.getLanguages({
          fields: [],
          page_size: '*',
        }),
      ).rejects.toThrow('page_size="*" requires 1-3 fields to be specified');
    });

    it('should throw an error for page_size="*" with more than 3 fields', async () => {
      await expect(
        languagesClient.getLanguages({
          fields: ['id', 'language', 'script', 'script_name'],
          page_size: '*',
        }),
      ).rejects.toThrow('page_size="*" requires 1-3 fields to be specified');
    });

    it('should allow page_size="*" with exactly 1 field', async () => {
      const languages = await languagesClient.getLanguages({
        fields: ['id'],
        page_size: '*',
      });
      expect(languages.data.length).toBeGreaterThan(0);
    });

    it('should allow page_size="*" with exactly 3 fields', async () => {
      const languages = await languagesClient.getLanguages({
        fields: ['id', 'language', 'script'],
        page_size: '*',
      });
      expect(languages.data.length).toBeGreaterThan(0);
    });

    it('should throw an error for invalid page_size - negative number', async () => {
      await expect(
        languagesClient.getLanguages({
          page_size: -1,
        }),
      ).rejects.toThrow();
    });

    it('should throw an error for invalid page_size - zero', async () => {
      await expect(
        languagesClient.getLanguages({
          page_size: 0,
        }),
      ).rejects.toThrow();
    });

    it('should throw an error for invalid page_size - decimal', async () => {
      await expect(
        languagesClient.getLanguages({
          page_size: 10.5,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getLanguage', () => {
    it('should fetch a language by ID', async () => {
      const language = await languagesClient.getLanguage('en');

      const { success } = LanguageSchema.safeParse(language);
      expect(success).toBe(true);
      expect(language.id).toBe('en');
      expect(language.language).toBe('en');
    });

    it('should fetch a language with script', async () => {
      const language = await languagesClient.getLanguage('sr-Latn');

      const { success } = LanguageSchema.safeParse(language);
      expect(success).toBe(true);
      expect(language.id).toBe('sr-Latn');
      expect(language.language).toBe('sr');
      expect(language.script).toBe('Latn');
      expect(language.script_name).toBe('latinica');
    });

    it('should throw an error for invalid language ID - empty string', async () => {
      await expect(languagesClient.getLanguage('')).rejects.toThrow(
        'Language ID must be a non-empty string',
      );
    });

    it('should throw an error for invalid language ID - whitespace', async () => {
      await expect(languagesClient.getLanguage('   ')).rejects.toThrow(
        'Language ID must be a non-empty string',
      );
    });

    it('should throw an error for invalid language ID - invalid format', async () => {
      await expect(languagesClient.getLanguage('invalid-format-123')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should throw an error for invalid language ID - uppercase', async () => {
      await expect(languagesClient.getLanguage('EN')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should throw an error for invalid language ID - single character', async () => {
      await expect(languagesClient.getLanguage('e')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should throw an error for invalid language ID - too long without script', async () => {
      await expect(languagesClient.getLanguage('engl')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should throw an error for invalid language ID - invalid script format (lowercase)', async () => {
      await expect(languagesClient.getLanguage('sr-latn')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should throw an error for invalid language ID - script too short', async () => {
      await expect(languagesClient.getLanguage('sr-Lat')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should throw an error for invalid language ID - script too long', async () => {
      await expect(languagesClient.getLanguage('sr-Latin')).rejects.toThrow(
        'Language ID must match BCP 47 format (language or language+script)',
      );
    });

    it('should accept valid 3-letter language code', async () => {
      const language = await languagesClient.getLanguage('por');

      const { success } = LanguageSchema.safeParse(language);
      expect(success).toBe(true);
      expect(language.id).toBe('por');
    });
  });
});
