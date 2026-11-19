import * as z from 'zod/mini';
import { object } from './object';
import { VideoIdSchema } from './video-id';

export { VideoIdSchema };

/** A playable video or audio source. */
export const VideoPlaybackSourceSchema = object({
  /**
   * URL for the playable video or audio source.
   *
   * Intentionally `z.string()`, not `z.url()`: the spec types video source URLs
   * as plain strings (no `format: uri`, unlike `FontSource.url`), and playback
   * URLs such as HLS manifests / CDN assets shouldn't be constrained by strict
   * URL validation.
   */
  url: z.string(),
  /** Source format. */
  format: z.enum(['hls', 'webm', 'mp4', 'mp3']),
});

export type VideoPlaybackSource = Readonly<z.infer<typeof VideoPlaybackSourceSchema>>;

/** A thumbnail image for a video. */
export const VideoThumbnailSchema = object({
  /** URL for the thumbnail image. */
  url: z.optional(z.nullable(z.url())),
  /** Thumbnail width in pixels. */
  width: z.optional(z.nullable(z.int())),
  /** Thumbnail height in pixels. */
  height: z.optional(z.nullable(z.int())),
});

export type VideoThumbnail = Readonly<z.infer<typeof VideoThumbnailSchema>>;

/** A dark-launched video resource approved for Platform consumers. */
export const VideoSchema = object({
  /** Opaque video identifier. Pass it to `VideosClient.getVideo` unchanged. */
  id: VideoIdSchema,
  /** Video title. */
  title: z.optional(z.nullable(z.string())),
  /** Video description. */
  description: z.optional(z.nullable(z.string())),
  /** Bible passage associated with the video (e.g., `1SA.17.45`). */
  passage_id: z.optional(z.nullable(z.string())),
  /** BCP 47 language tag for the video. */
  language_tag: z.optional(z.nullable(z.string())),
  /** Runtime in seconds. */
  runtime: z.optional(z.nullable(z.int())),
  /** Video orientation. */
  orientation: z.optional(z.nullable(z.enum(['landscape', 'portrait']))),
  /** Thumbnail image. */
  thumbnail: z.optional(z.nullable(VideoThumbnailSchema)),
  /** Playable video or audio sources. */
  playback_sources: z.array(VideoPlaybackSourceSchema),
  /** Preview clip sources. */
  playback_preview_sources: z.array(VideoPlaybackSourceSchema),
  /** Share URL for the video. */
  share_url: z.optional(z.nullable(z.string())),
});

export type Video = Readonly<z.infer<typeof VideoSchema>>;

/** Supported thumbnail renditions. Omit the option for the full-size image. */
export const VideoThumbnailSizeSchema = z.enum(['thumb', 'card', 'full']);

export type VideoThumbnailSize = z.infer<typeof VideoThumbnailSizeSchema>;

export const GetVideoOptionsSchema = object({
  /** Language preference sent as `Accept-Language`. Omit to use the runtime's default. */
  acceptLanguage: z.optional(z.string().check(z.minLength(1))),
  /** Requested thumbnail rendition. Omit for the full-size image. */
  thumbnailSize: z.optional(VideoThumbnailSizeSchema),
});

export type GetVideoOptions = z.infer<typeof GetVideoOptionsSchema>;

const PLAYLIST_ID_ERROR = 'Playlist ID must be a 32-bit integer';

export const VideoPlaylistIdSchema = z
  .int({ error: PLAYLIST_ID_ERROR })
  .check(z.gte(-2_147_483_648, PLAYLIST_ID_ERROR), z.lte(2_147_483_647, PLAYLIST_ID_ERROR));

/** Full playlist wire shape used when field selection is not active. */
const VideoPlaylistFields = {
  id: VideoPlaylistIdSchema,
  title: z.string(),
  description: z.nullable(z.string()),
  type: z.string(),
  total: z.int(),
  videos: z.array(VideoIdSchema),
};

export const VideoPlaylistFullSchema = object(VideoPlaylistFields);

/** A video playlist. Fields are optional because collection field selection can omit any field. */
export const VideoPlaylistSchema = object({
  /** Playlist identifier. */
  id: z.optional(VideoPlaylistFields.id),
  /** Localized playlist title. */
  title: z.optional(VideoPlaylistFields.title),
  /** Localized description, or null when the playlist has none. */
  description: z.optional(VideoPlaylistFields.description),
  /** Upstream playlist type. */
  type: z.optional(VideoPlaylistFields.type),
  /** Number of videos in the playlist. */
  total: z.optional(VideoPlaylistFields.total),
  /** Ordered opaque video ids. */
  videos: z.optional(VideoPlaylistFields.videos),
});

export type VideoPlaylist = Readonly<z.infer<typeof VideoPlaylistSchema>>;

export const VideoPlaylistFieldSchema = z.keyof(VideoPlaylistSchema);
export type VideoPlaylistField = z.infer<typeof VideoPlaylistFieldSchema>;

const PlaylistNextPageTokenSchema = z.pipe(
  z.optional(z.nullable(z.string())),
  z.transform((token): string | null => token ?? null),
);

export const VideoPlaylistCollectionSchema = object({
  data: z.array(VideoPlaylistSchema),
  next_page_token: PlaylistNextPageTokenSchema,
});

export const VideoPlaylistFullCollectionSchema = object({
  data: z.array(VideoPlaylistFullSchema),
  next_page_token: PlaylistNextPageTokenSchema,
});

const PLAYLIST_PAGE_SIZE_ERROR = 'Page size must be an integer from 1 to 99, or "*"';

export const GetPlaylistsOptionsSchema = object({
  fields: z.optional(z.array(VideoPlaylistFieldSchema).check(z.minLength(1))),
  page_size: z.optional(
    z.union([
      z
        .int({ error: PLAYLIST_PAGE_SIZE_ERROR })
        .check(z.gte(1, PLAYLIST_PAGE_SIZE_ERROR), z.lte(99, PLAYLIST_PAGE_SIZE_ERROR)),
      z.literal('*'),
    ]),
  ),
  page_token: z.optional(z.string()),
  accept_language: z.optional(z.string().check(z.minLength(1))),
});

export type GetPlaylistsOptions = z.infer<typeof GetPlaylistsOptionsSchema>;

export const GetPlaylistOptionsSchema = object({
  accept_language: z.optional(z.string().check(z.minLength(1))),
});

export type GetPlaylistOptions = z.infer<typeof GetPlaylistOptionsSchema>;
