import { describe, it, expect, beforeEach } from 'vitest';
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
  });
});
