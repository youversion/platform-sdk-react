import type { ApiClient } from './client';
import { BibleVersionIdSchema } from './schemas/version';
import {
  SearchTextQuerySchema,
  SearchVersesOptionsSchema,
  SearchVersesWireSchema,
  toSearchVersesResponse,
  type SearchVersesOptions,
  type SearchVersesResponse,
} from './schemas/search';

export type { SearchVersesOptions };

type SearchVersesQuery = {
  query: string;
  bible_id: number;
  user_intent?: string;
  page_size?: number;
  page_token?: string;
};

export async function searchVerses(
  client: ApiClient,
  query: string,
  versionId: number,
  options: SearchVersesOptions = {},
): Promise<SearchVersesResponse> {
  const parsedQuery = SearchTextQuerySchema.parse(query);
  BibleVersionIdSchema.parse(versionId);
  SearchVersesOptionsSchema.parse(options);

  const params: SearchVersesQuery = {
    query: parsedQuery,
    bible_id: versionId,
  };

  if (options.userIntent !== undefined) {
    params.user_intent = options.userIntent;
  }
  if (options.pageSize !== undefined) {
    params.page_size = options.pageSize;
  }
  if (options.pageToken !== undefined) {
    params.page_token = options.pageToken;
  }

  const response = await client.get<unknown>('/v1/search-verses', params);

  const parsed = SearchVersesWireSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Unexpected search-verses API response: ${parsed.error.message}`);
  }

  return toSearchVersesResponse(parsed.data);
}
