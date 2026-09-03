import type { ApiClient } from './client';
import type { Collection, Language } from './types';
import { getLanguage } from './languages-language';
import { getLanguages, type GetLanguagesOptions } from './languages-list';

export type { GetLanguagesOptions };

/**
 * Client for interacting with Languages API endpoints.
 */
export class LanguagesClient {
  private client: ApiClient;

  /**
   * Creates a new LanguagesClient instance.
   * @param client The API client to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Fetches a collection of languages supported in the Platform.
   * @param options Query parameters for pagination and filtering.
   * @returns A collection of Language objects.
   */
  async getLanguages(options: GetLanguagesOptions = {}): Promise<Collection<Language>> {
    return getLanguages(this.client, options);
  }

  /**
   * Fetches details about a specific language in the Platform.
   * @param languageId The BCP 47 language code (optionally including script, e.g., "en" or "sr-Latn").
   * @returns The requested Language object.
   */
  async getLanguage(languageId: string): Promise<Language> {
    return getLanguage(this.client, languageId);
  }
}
