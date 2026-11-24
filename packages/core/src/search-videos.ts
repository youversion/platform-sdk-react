import type { ApiClient } from './client';
import {
  SearchVideosOptionsSchema,
  SearchVideosQuerySchema,
  SearchVideosWireSchema,
  type SearchVideosOptions,
  type SearchVideosResponse,
} from './schemas/search-videos';
import { resolveVideoThumbnail } from './video-thumbnail';

export type { SearchVideosOptions };

type SearchVideosQuery = {
  query: string;
  'organization_ids[]'?: string[];
  page_size?: number;
  page_token?: string;
};

/**
 * Searches the video catalog and returns full video resource records.
 * When continuing with a page token, repeat the query, organization filters, and
 * language from the previous request. The page size may change. A null input
 * cursor requests the first page. Language defaults to English, as in the search API.
 * Empty pages can have continuation tokens. Continue until `nextPageToken` is
 * null. Empty string tokens are preserved unchanged. No total count is returned.
 */
export async function searchVideos(
  client: ApiClient,
  query: string,
  options: SearchVideosOptions = {},
): Promise<SearchVideosResponse> {
  const parsedQuery = SearchVideosQuerySchema.parse(query);
  const parsedOptions = SearchVideosOptionsSchema.parse(options);
  const params: SearchVideosQuery = { query: parsedQuery };
  if (parsedOptions.organizationIds !== undefined) {
    params['organization_ids[]'] = [...parsedOptions.organizationIds];
  }
  if (parsedOptions.pageSize !== undefined) params.page_size = parsedOptions.pageSize;
  if (parsedOptions.pageToken != null) params.page_token = parsedOptions.pageToken;

  const body = await client.get<unknown>('/v1/search-videos', params, {
    'Accept-Language': parsedOptions.acceptLanguage ?? 'en',
  });
  const parsed = SearchVideosWireSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Unexpected search-videos API response: ${parsed.error.message}`);
  }
  const response: SearchVideosResponse = {
    videos: parsed.data.videos.map((video) => resolveVideoThumbnail(video)),
    didYouMean: parsed.data.did_you_mean,
    searchInsteadFor: parsed.data.search_instead_for ?? null,
    nextPageToken: parsed.data.next_page_token ?? null,
  };
  return parsed.data.user_intent == null
    ? response
    : { ...response, userIntent: parsed.data.user_intent };
}
