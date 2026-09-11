import type { ApiClient } from './client';
import {
  parseLanguageRanges,
  SearchQueriesSchema,
  SearchQueriesWireSchema,
  SuggestedSearchQuerySchema,
  toSearchQuery,
  type SearchQueries,
  type SearchQueriesWire,
} from './schemas/search';

function parseSearchQueriesResponse(
  response: SearchQueriesWire | '' | null | undefined,
): SearchQueries {
  if (response === '' || response == null) {
    return { queries: [] };
  }

  const parsed = SearchQueriesWireSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Unexpected search-queries API response: ${parsed.error.message}`);
  }

  return SearchQueriesSchema.parse({
    queries: parsed.data.data.map(toSearchQuery),
  });
}

export async function getSuggestedQueries(
  client: ApiClient,
  query: string,
  languageRanges: string | string[],
): Promise<SearchQueries> {
  const parsedQuery = SuggestedSearchQuerySchema.parse(query);
  const parsedLanguageRanges = parseLanguageRanges(languageRanges);

  const response = await client.get<SearchQueriesWire | '' | null>('/v1/search-queries', {
    query: parsedQuery,
    'language_ranges[]': parsedLanguageRanges,
  });

  return parseSearchQueriesResponse(response);
}

export async function getTrendingQueries(
  client: ApiClient,
  languageRanges: string | string[],
): Promise<SearchQueries> {
  const parsedLanguageRanges = parseLanguageRanges(languageRanges);

  const response = await client.get<SearchQueriesWire | '' | null>('/v1/search-queries', {
    trending: true,
    'language_ranges[]': parsedLanguageRanges,
  });

  return parseSearchQueriesResponse(response);
}
