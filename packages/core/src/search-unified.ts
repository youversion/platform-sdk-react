import type { ApiClient } from './client';
import { BibleVersionIdSchema } from './schemas/version';
import {
  parseLanguageRanges,
  SearchTextQuerySchema,
  SearchUnifiedOptionsSchema,
  SearchUnifiedWireSchema,
  toSearchUnifiedResponse,
  type SearchUnifiedField,
  type SearchUnifiedOptions,
  type SearchUnifiedResponse,
} from './schemas/search';

export type { SearchUnifiedOptions };

type SearchUnifiedQuery = {
  query: string;
  bible_id: number;
  'language_ranges[]': string[];
  user_intent?: string;
  'fields[]'?: SearchUnifiedField[];
};

/**
 * Searches verses and topics in one unpaginated request.
 * @param query Search text (1 to 100 graphemes).
 * @param versionId Bible version identifier (sent to the API as `bible_id`).
 * @param languageRanges Ordered language ranges (`en_US` is normalized to `en-us` on the wire).
 * @param options Optional `userIntent` and nonempty `fields` selection (`verses` or `topics`).
 */
export async function searchUnified(
  client: ApiClient,
  query: string,
  versionId: number,
  languageRanges: string | readonly string[],
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
  if (parsedOptions.fields !== undefined) {
    params['fields[]'] = parsedOptions.fields;
  }

  const response = await client.get<unknown>('/v1/search-unified', params);

  const parsed = SearchUnifiedWireSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Unexpected search-unified API response: ${parsed.error.message}`);
  }

  return toSearchUnifiedResponse(parsed.data);
}
