import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../client';
import { LanguagesClient } from '../languages';
import { LanguageSchema } from '../schemas';

describe('LanguagesClient', () => {
  let apiClient: ApiClient;
  let languagesClient: LanguagesClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      baseUrl: 'https://api-dev.youversion.com',
      appKey: process.env.YVP_APP_KEY || '',
      version: 'v1',
      installationId: 'test-installation',
    });
    languagesClient = new LanguagesClient(apiClient);
  });

  describe('getLanguages', () => {
    it('should fetch languages with required country param', async () => {
      const languages = await languagesClient.getLanguages({ country: 'US' });

      const { success } = LanguageSchema.safeParse(languages.data[0]);
      expect(success).toBe(true);
      expect(languages.data).toHaveLength(25);
      expect(languages.data[0]).toHaveProperty('countries', expect.arrayContaining(['US']));
    });

    it('should fetch languages with page_size option', async () => {
      const languages = await languagesClient.getLanguages({ country: 'US', page_size: 10 });

      const { success } = LanguageSchema.safeParse(languages.data[0]);
      expect(success).toBe(true);
      expect(languages.data).toHaveLength(10);
      expect(languages.next_page_token).toBe('eyJzdGFydCI6IDEwfQ==');
    });

    it('should fetch languages with page_token option', async () => {
      const languages = await languagesClient.getLanguages({
        country: 'US',
        page_token: 'eyJzdGFydCI6IDEwMH0=',
      });

      const { success } = LanguageSchema.safeParse(languages.data[0]);
      expect(success).toBe(true);
      expect(languages.data).toHaveLength(25);
    });

    it('should uppercase country code', async () => {
      const languages = await languagesClient.getLanguages({ country: 'us' });

      expect(languages.data[0]?.countries).toContain('US');
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

    it('should throw an error for invalid page_size - zero', async () => {
      await expect(languagesClient.getLanguages({ country: 'US', page_size: 0 })).rejects.toThrow();
    });

    it('should throw an error for invalid page_size - negative', async () => {
      await expect(
        languagesClient.getLanguages({ country: 'US', page_size: -1 }),
      ).rejects.toThrow();
    });

    it('should throw an error for invalid page_size - non-integer', async () => {
      await expect(
        languagesClient.getLanguages({ country: 'US', page_size: 1.5 }),
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
  });
});
