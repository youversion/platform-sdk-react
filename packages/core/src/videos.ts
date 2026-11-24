import type { ApiClient } from './client';
import {
  GetPlaylistOptionsSchema,
  GetPlaylistsOptionsSchema,
  GetVideoOptionsSchema,
  VideoIdSchema,
  VideoPlaylistCollectionSchema,
  VideoPlaylistFullCollectionSchema,
  VideoPlaylistFullSchema,
  VideoPlaylistIdSchema,
  ContentLibraryVideoSchema,
  type GetPlaylistOptions,
  type GetPlaylistsOptions,
  type GetVideoOptions,
  type ContentLibraryVideo,
  type VideoPlaylist,
  type VideoPlaylistField,
} from './schemas/video';
import { OrganizationIdSchema } from './schemas/organization';
import type { Collection } from './types';
import { resolveVideoThumbnail } from './video-thumbnail';

export type { GetPlaylistOptions, GetPlaylistsOptions, GetVideoOptions };

const VIDEOS_PATH = '/v1/videos';

type PlaylistsQuery = {
  'fields[]'?: VideoPlaylistField[];
  page_size?: number | '*';
  page_token?: string;
};

/**
 * Client for video detail and playlist resources. Requires an app key with catalog access.
 *
 * Playlist requests explicitly default to English for YPE-6461, which can return
 * a cached empty catalog when the language header is absent. Explicit caller
 * preferences are honored. Video details preserve the runtime's language default.
 *
 * Failures:
 * - Invalid options or IDs throw schema errors before a request.
 * - Playlist collection 204 or empty wire bodies return an empty collection.
 * - Nonempty malformed payloads, including JSON null, throw contract errors.
 * - Detail calls require a resource body; a 204 or empty body rejects.
 * - Non-2xx responses throw; read their status with `getHttpStatus`.
 */
export class VideosClient {
  private client: ApiClient;

  /** @param client The API client to use for requests. */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Fetches one video by its opaque id.
   *
   * If `acceptLanguage` is omitted, browsers may send the user's locale while
   * non-browser runtimes may send no language preference.
   *
   * @param videoId A video id returned by search or a playlist. Pass it unchanged.
   * @param options Language and thumbnail rendition preferences.
   * @returns The validated video with a ready-to-use thumbnail URL.
   * @throws An error with status 404 for an unknown or expired opaque id. A 404
   *   can also mean the app has not accepted the Extra-Biblical Content agreement.
   *   Read the status with `getHttpStatus`.
   */
  async getVideo(videoId: string, options: GetVideoOptions = {}): Promise<ContentLibraryVideo> {
    const id = VideoIdSchema.parse(videoId);
    const parsedOptions = GetVideoOptionsSchema.parse(options);
    const headers = parsedOptions.acceptLanguage
      ? { 'Accept-Language': parsedOptions.acceptLanguage }
      : undefined;
    const body = await this.client.get<unknown>(
      `${VIDEOS_PATH}/${encodeURIComponent(id)}`,
      undefined,
      headers,
    );
    const parsed = ContentLibraryVideoSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`Unexpected videos API response: ${parsed.error.message}`);
    }
    return resolveVideoThumbnail(parsed.data, parsedOptions.thumbnailSize);
  }

  /**
   * Lists an organization's localized video playlists.
   * @param organizationId Organization UUID.
   * @param options Field selection, pagination, and language. Language defaults to English.
   *   `pageSize: '*'` requires one to three selected fields.
   * @returns One page, or an empty page when no language catalog matches.
   * @throws Invalid input, malformed nonempty payloads (including JSON null), or
   *   HTTP errors. Read HTTP status with `getHttpStatus`.
   */
  async getPlaylists(
    organizationId: string,
    options: GetPlaylistsOptions = {},
  ): Promise<Collection<VideoPlaylist>> {
    const id = OrganizationIdSchema.parse(organizationId);
    const parsedOptions = GetPlaylistsOptionsSchema.parse(options);
    if (
      parsedOptions.pageSize === '*' &&
      (parsedOptions.fields === undefined || parsedOptions.fields.length > 3)
    ) {
      throw new Error('pageSize="*" requires 1-3 fields to be specified');
    }
    const query: PlaylistsQuery = {};
    if (parsedOptions.fields !== undefined) query['fields[]'] = parsedOptions.fields;
    if (parsedOptions.pageSize !== undefined) query.page_size = parsedOptions.pageSize;
    if (parsedOptions.pageToken != null) query.page_token = parsedOptions.pageToken;

    const response = await this.client.getWithStatus<unknown>(
      `/v1/organizations/${encodeURIComponent(id)}/playlists`,
      query,
      { 'Accept-Language': parsedOptions.acceptLanguage ?? 'en' },
    );
    if (response.status === 204 || response.emptyBody) {
      return { data: [], next_page_token: null };
    }
    const body = response.data;
    const parsed = (
      parsedOptions.fields === undefined
        ? VideoPlaylistFullCollectionSchema
        : VideoPlaylistCollectionSchema
    ).safeParse(body);
    if (!parsed.success) {
      throw new Error(`Unexpected playlists API response: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  /**
   * Fetches one full localized playlist. Language defaults to English.
   * @param organizationId Publisher organization UUID.
   * @param playlistId Numeric playlist identifier.
   * @param options Accept-Language preference.
   * @returns The validated full playlist, with every resource field present.
   * @throws Invalid input, malformed/empty responses, or HTTP errors. Read HTTP
   *   status with `getHttpStatus`.
   */
  async getPlaylist(
    organizationId: string,
    playlistId: number,
    options: GetPlaylistOptions = {},
  ): Promise<Readonly<Required<VideoPlaylist>>> {
    const organization = OrganizationIdSchema.parse(organizationId);
    const playlist = VideoPlaylistIdSchema.parse(playlistId);
    const parsedOptions = GetPlaylistOptionsSchema.parse(options);
    const body = await this.client.get<unknown>(
      `/v1/organizations/${encodeURIComponent(organization)}/playlists/${playlist}`,
      undefined,
      { 'Accept-Language': parsedOptions.acceptLanguage ?? 'en' },
    );
    const parsed = VideoPlaylistFullSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`Unexpected playlists API response: ${parsed.error.message}`);
    }
    return parsed.data;
  }
}
