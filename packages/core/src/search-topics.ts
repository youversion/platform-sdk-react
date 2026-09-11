import type { ApiClient } from './client';
import {
  parseLanguageRanges,
  SearchTextQuerySchema,
  SearchTopicsWireSchema,
  toSearchTopicsResponse,
  type SearchTopicsResponse,
} from './schemas/search';

export async function searchTopics(
  client: ApiClient,
  query: string,
  languageRanges: string | string[],
): Promise<SearchTopicsResponse> {
  const parsedQuery = SearchTextQuerySchema.parse(query);
  const parsedLanguageRanges = parseLanguageRanges(languageRanges);

  const response = await client.get<unknown>('/v1/search-topics', {
    query: parsedQuery,
    'language_ranges[]': parsedLanguageRanges,
  });

  const parsed = SearchTopicsWireSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Unexpected search-topics API response: ${parsed.error.message}`);
  }

  return toSearchTopicsResponse(parsed.data);
}
