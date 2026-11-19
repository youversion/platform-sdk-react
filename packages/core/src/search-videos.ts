import type { ApiClient } from './client';
import {
  SearchTextQuerySchema,
  SearchVideosOptionsSchema,
  SearchVideosWireSchema,
  type SearchVideosOptions,
  type SearchVideosResponse,
} from './schemas/search';
import { resolveVideoThumbnail } from './video-thumbnail';

export type { SearchVideosOptions };

type SearchVideosQuery = {
  query: string;
  'organization_ids[]'?: string[];
  page_size?: number;
  page_token?: string;
};

/** Searches the beta video catalog and returns full video resource records. */
export async function searchVideos(
  client: ApiClient,
  query: string,
  options: SearchVideosOptions = {},
): Promise<SearchVideosResponse> {
  const parsedQuery = SearchTextQuerySchema.parse(query);
  const parsedOptions = SearchVideosOptionsSchema.parse(options);
  const params: SearchVideosQuery = { query: parsedQuery };
  if (parsedOptions.organizationIds !== undefined) {
    params['organization_ids[]'] = [...parsedOptions.organizationIds];
  }
  if (parsedOptions.pageSize !== undefined) params.page_size = parsedOptions.pageSize;
  if (parsedOptions.pageToken !== undefined) params.page_token = parsedOptions.pageToken;

  const body = await client.get<unknown>('/v1-beta/search-videos', params, {
    'Accept-Language': parsedOptions.acceptLanguage ?? 'en',
  });
  if (body === '' || body == null) {
    return {
      videos: [],
      didYouMean: [],
      searchInsteadFor: null,
      nextPageToken: null,
    };
  }
  const parsed = SearchVideosWireSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Unexpected search-videos API response: ${parsed.error.message}`);
  }
  const response: SearchVideosResponse = {
    videos: parsed.data.videos.map((video) => resolveVideoThumbnail(video)),
    didYouMean: parsed.data.did_you_mean,
    searchInsteadFor: parsed.data.search_instead_for,
    nextPageToken: parsed.data.next_page_token ?? null,
  };
  return parsed.data.user_intent == null
    ? response
    : { ...response, userIntent: parsed.data.user_intent };
}
