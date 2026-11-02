import type { ApiClient } from './client';
import { BibleVersionIdSchema } from './schemas/version';
import {
  SearchImagesOptionsSchema,
  SearchImagesWireSchema,
  SearchTextQuerySchema,
  toSearchImagesResponse,
  type SearchImagesOptions,
  type SearchImagesResponse,
} from './schemas/search';

export type { SearchImagesOptions };

type SearchImagesQuery = {
  query: string;
  bible_id: number;
  page_size?: number;
  page_token?: string;
};

export async function searchImages(
  client: ApiClient,
  query: string,
  versionId: number,
  options: SearchImagesOptions = {},
): Promise<SearchImagesResponse> {
  const parsedQuery = SearchTextQuerySchema.parse(query);
  BibleVersionIdSchema.parse(versionId);
  const parsedOptions = SearchImagesOptionsSchema.parse(options);

  const params: SearchImagesQuery = {
    query: parsedQuery,
    bible_id: versionId,
  };
  if (parsedOptions.pageSize !== undefined) {
    params.page_size = parsedOptions.pageSize;
  }
  if (parsedOptions.pageToken !== undefined) {
    params.page_token = parsedOptions.pageToken;
  }

  const response = await client.get<unknown>('/v1/search-images', params);
  const parsed = SearchImagesWireSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error(`Unexpected search-images API response: ${parsed.error.message}`);
  }

  return toSearchImagesResponse(parsed.data);
}
