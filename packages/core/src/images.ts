import type { ApiClient } from './client';
import type { Collection, VerseImage } from './types';
import {
  GetImagesOptionsSchema,
  ImageCollectionWireSchema,
  ImageIdSchema,
  ImageSchema,
  type GetImagesOptions,
  type ImageCollectionWire,
} from './schemas/image';

export type { GetImagesOptions };

const IMAGES_PATH = '/v1/images';

type ImagesListQuery = {
  passage_id?: string;
  'language_ranges[]'?: string[];
  page_size?: number;
  page_token?: string;
};

/**
 * Client for the verse-art Images API.
 *
 * Requests go to `/v1/images`. The client returns metadata only.
 * Image bytes come from the CDN at `Image.image_url`.
 *
 * Calls use the app key on `ApiClient`. No `Authorization` header is added.
 *
 * Failures:
 * - Invalid options or ids throw the schema error before any request.
 * - HTTP 204 and an empty body return `{ data: [], next_page_token: null }`.
 * - A body that breaks the contract throws an error whose message starts with
 *   `Unexpected images API response`.
 * - A non-2xx response throws an error. Read the status with `getHttpStatus`.
 */
export class ImagesClient {
  private client: ApiClient;

  /**
   * @param client The API client to use for requests.
   */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Lists images, optionally filtered by passage and language.
   * @param options Filters and pagination. Invalid options throw before any request.
   * @returns One page. `next_page_token` is `null` on the last page. `total_size`
   *   is present only when the API reports a number, which it does when
   *   `passage_id` is set. That value is the server's count and can exceed
   *   `data.length` when off-contract records were dropped. `0` is kept.
   *   No matches returns an empty page.
   */
  async getImages(options: GetImagesOptions = {}): Promise<Collection<VerseImage>> {
    const parsed = GetImagesOptionsSchema.parse(options);
    // ApiClient.get: empty JSON body → undefined; HTTP 204 → ''.
    const body = await this.client.get<unknown>(IMAGES_PATH, toImagesQuery(parsed));
    if (body === '' || body == null) {
      return { data: [], next_page_token: null };
    }
    const parsedBody = ImageCollectionWireSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new Error(`Unexpected images API response: ${parsedBody.error.message}`);
    }
    return toImageCollection(parsedBody.data);
  }

  /**
   * Fetches one image by its opaque id.
   *
   * The id is placed on the path unchanged (blank rejected) with one
   * `encodeURIComponent` call. Pass `Image.id` or a search hit as stored.
   * Percent-encoding the id before this call encodes it a second time and
   * changes the path.
   *
   * @param imageId `Image.id` from a list response or a search hit.
   * @returns The image record. Unlike `getImages`, which drops list items that
   *   break the contract, this throws when the record breaks the contract.
   * @throws An error with status 404 when no image has this id. Read it with `getHttpStatus`.
   */
  async getImage(imageId: string): Promise<VerseImage> {
    const id = ImageIdSchema.parse(imageId);
    const body = await this.client.get<unknown>(`${IMAGES_PATH}/${encodeURIComponent(id)}`);
    const parsed = ImageSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`Unexpected images API response: ${parsed.error.message}`);
    }
    return parsed.data;
  }
}

function toImagesQuery(options: GetImagesOptions): ImagesListQuery {
  const query: ImagesListQuery = {};
  if (options.passage_id !== undefined) {
    query.passage_id = options.passage_id;
  }
  if (options.language_ranges !== undefined) {
    query['language_ranges[]'] = [...options.language_ranges];
  }
  if (options.page_size !== undefined) {
    query.page_size = options.page_size;
  }
  if (options.page_token != null) {
    query.page_token = options.page_token;
  }
  return query;
}

function toImageCollection(wire: ImageCollectionWire): Collection<VerseImage> {
  const page: Collection<VerseImage> = {
    data: wire.data,
    next_page_token: wire.next_page_token,
  };
  if (wire.total_size == null) {
    return page;
  }
  return { ...page, total_size: wire.total_size };
}
