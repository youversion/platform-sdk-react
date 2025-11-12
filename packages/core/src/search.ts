import type { ApiClient } from './client';
import type { SearchResponse } from './types';

/**
 * Client for YouVersion Search API (`search.youversionapi.com`).
 *
 * This thin wrapper is responsible for building the correct query parameters
 * and headers required by the search service. Networking & caching concerns
 * are delegated to the injected {@link ApiClient} instance.
 */
export class SearchClient {
  private client: ApiClient;

  /**
   * Instantiate a new `SearchClient`.
   *
   * @param client - Pre-configured {@link ApiClient} used to perform HTTP requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Perform a full-text search over Bible verses.
   *
   * @param query - User-supplied search phrase.
   * @param versionId - Numeric Bible version identifier (e.g. `111` for NLT).
   * @returns Promise that resolves with a {@link SearchResponse} containing search hits and facets.
   *
   * @example
   * ```ts
   * const results = await searchClient.search("The Lord is my Shepherd", 111);
   * console.log(results.data[0].usfm); // "PSA.23.1"
   * ```
   */
  async search(query: string, versionId: number): Promise<SearchResponse> {
    const params = {
      query,
      user_intent: 'unknown',
      bible_version_id: versionId,
    } as const;

    const headers = {
      Referer: 'http://yvapi.youversionapi.com',
      'X-YouVersion-Client': 'youversion',
      'X-YouVersion-App-Platform': 'internal',
      'X-YouVersion-App-Version': '1',
      Accept: 'application/json',
      'Accept-Language': 'en',
    } as const;

    return this.client.get<SearchResponse>(
      'https://search.youversionapi.com/4.0/verses',
      params,
      headers,
    );
  }
}
