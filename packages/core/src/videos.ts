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
  VideoSchema,
  type GetPlaylistOptions,
  type GetPlaylistsOptions,
  type GetVideoOptions,
  type Video,
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

/** Client for video detail and playlist resources. */
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
  async getVideo(videoId: string, options: GetVideoOptions = {}): Promise<Video> {
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
    const parsed = VideoSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`Unexpected videos API response: ${parsed.error.message}`);
    }
    return resolveVideoThumbnail(parsed.data, parsedOptions.thumbnailSize);
  }

  /**
   * Lists an organization's localized video playlists.
   * @param organizationId Organization UUID.
   * @param options Field selection, pagination, and language. Language defaults to English.
   *   `page_size: '*'` requires one to three selected fields.
   * @returns One page, or an empty page when no language catalog matches.
   */
  async getPlaylists(
    organizationId: string,
    options: GetPlaylistsOptions = {},
  ): Promise<Collection<VideoPlaylist>> {
    const id = OrganizationIdSchema.parse(organizationId);
    const parsedOptions = GetPlaylistsOptionsSchema.parse(options);
    if (
      parsedOptions.page_size === '*' &&
      (parsedOptions.fields === undefined ||
        parsedOptions.fields.length < 1 ||
        parsedOptions.fields.length > 3)
    ) {
      throw new Error('page_size="*" requires 1-3 fields to be specified');
    }
    const query: PlaylistsQuery = {};
    if (parsedOptions.fields !== undefined) query['fields[]'] = parsedOptions.fields;
    if (parsedOptions.page_size !== undefined) query.page_size = parsedOptions.page_size;
    if (parsedOptions.page_token !== undefined) query.page_token = parsedOptions.page_token;

    const body = await this.client.get<unknown>(
      `/v1/organizations/${encodeURIComponent(id)}/playlists`,
      query,
      { 'Accept-Language': parsedOptions.accept_language ?? 'en' },
    );
    if (body === undefined) {
      return { data: [], next_page_token: null };
    }
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

  /** Fetches one localized playlist. Language defaults to English. */
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
      { 'Accept-Language': parsedOptions.accept_language ?? 'en' },
    );
    const parsed = VideoPlaylistFullSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`Unexpected playlists API response: ${parsed.error.message}`);
    }
    return parsed.data;
  }
}
