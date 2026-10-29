import type { ApiClient } from './client';
import { getSuggestedQueries, getTrendingQueries } from './search-queries';
import { searchTopics } from './search-topics';
import { searchUnified, type SearchUnifiedOptions } from './search-unified';
import { searchVerses, type SearchVersesOptions } from './search-verses';
import type {
  SearchQueries,
  SearchTopicsResponse,
  SearchUnifiedResponse,
  SearchVersesResponse,
} from './schemas/search';

export type { SearchUnifiedOptions, SearchVersesOptions };

/**
 * Client for YouVersion Platform Search API endpoints (`/v1/*`).
 */
export class SearchClient {
  private client: ApiClient;

  /**
   * Creates a new SearchClient instance.
   * @param client The API client to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Returns query suggestions matching a partial query string.
   * @param query Non-empty partial query text.
   * @param languageRanges One or more Basic Language Ranges (e.g., `en`, `en-US`, `en_US`, `*`).
   */
  async getSuggestedQueries(
    query: string,
    languageRanges: string | string[],
  ): Promise<SearchQueries> {
    return getSuggestedQueries(this.client, query, languageRanges);
  }

  /**
   * Returns trending queries when no partial query is supplied.
   * @param languageRanges One or more Basic Language Ranges (e.g., `en`, `en-US`, `en_US`, `*`).
   */
  async getTrendingQueries(languageRanges: string | string[]): Promise<SearchQueries> {
    return getTrendingQueries(this.client, languageRanges);
  }

  /**
   * Searches verses within a single Bible version.
   * @param query Search text (1–100 characters).
   * @param versionId Bible version identifier (sent to the API as `bible_id`).
   * @param options Optional pagination and user-intent parameters.
   */
  async searchVerses(
    query: string,
    versionId: number,
    options?: SearchVersesOptions,
  ): Promise<SearchVersesResponse> {
    return searchVerses(this.client, query, versionId, options);
  }

  /**
   * Returns topics related to a query. This endpoint is unpaginated.
   * @param query Search text (1–100 characters).
   * @param languageRanges Ordered language ranges (`en_US` is normalized to `en-us` on the wire).
   */
  async searchTopics(
    query: string,
    languageRanges: string | string[],
  ): Promise<SearchTopicsResponse> {
    return searchTopics(this.client, query, languageRanges);
  }

  /**
   * Searches verses, topics, and images in one unpaginated request.
   * Image hits are `id` and `passageId` only.
   * @param query Search text (1 to 100 graphemes).
   * @param versionId Bible version identifier (sent to the API as `bible_id`).
   * @param languageRanges Ordered language ranges (`en_US` is normalized to `en-us` on the wire).
   * @param options Optional `userIntent` and `fields` (`verses`, `topics`, or `images`).
   */
  async searchUnified(
    query: string,
    versionId: number,
    languageRanges: string | readonly string[],
    options?: SearchUnifiedOptions,
  ): Promise<SearchUnifiedResponse> {
    return searchUnified(this.client, query, versionId, languageRanges, options);
  }
}
