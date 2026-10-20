import type { ApiClient } from './client';
import { BibleVersionIdSchema } from './schemas/version';
import {
  parseLanguageRanges,
  SearchTextQuerySchema,
  SearchUnifiedOptionsSchema,
  SearchUnifiedWireSchema,
  toSearchUnifiedResponse,
  type SearchUnifiedOptions,
  type SearchUnifiedResponse,
} from './schemas/search';

type SearchUnifiedQuery = {
  query: string;
  bible_id: number;
  'language_ranges[]': string[];
  user_intent?: string;
  'fields[]'?: string[];
};

/** Fetches one unpaginated snapshot of top verse references and related topics. */
export async function searchUnified(
  client: ApiClient,
  query: string,
  versionId: number,
  languageRanges: string | string[],
  options: SearchUnifiedOptions = {},
): Promise<SearchUnifiedResponse> {
  const parsedQuery = SearchTextQuerySchema.parse(query);
  BibleVersionIdSchema.parse(versionId);
  const parsedLanguageRanges = parseLanguageRanges(languageRanges);
  const parsedOptions = SearchUnifiedOptionsSchema.parse(options);

  const params: SearchUnifiedQuery = {
    query: parsedQuery,
    bible_id: versionId,
    'language_ranges[]': parsedLanguageRanges,
  };
  if (parsedOptions.userIntent !== undefined) {
    params.user_intent = parsedOptions.userIntent;
  }
  if (parsedOptions.fields?.length) {
    params['fields[]'] = parsedOptions.fields;
  }

  const response = await client.get<unknown>('/v1/search-unified', params);

  const parsed = SearchUnifiedWireSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Unexpected search-unified API response: ${parsed.error.message}`);
  }
  return toSearchUnifiedResponse(parsed.data);
}
