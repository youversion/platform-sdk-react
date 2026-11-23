import * as z from 'zod/mini';
import { object } from './object';
import { VideoIdSchema } from './video-id';
import { VideoFields } from './video-resource';

export { VideoIdSchema };
export {
  ContentLibraryVideoSchema,
  VideoPlaybackSourceSchema,
  VideoThumbnailSchema,
} from './video-resource';
export type { ContentLibraryVideo, VideoPlaybackSource, VideoThumbnail } from './video-resource';

const LegacyVideoSchema = object({
  ...VideoFields,
  /** Legacy numeric video identifier. */
  id: z.number(),
  /** Bible references associated with the legacy video. */
  references: z.optional(z.nullable(z.array(z.string()))),
});

/** Legacy v3 video model with numeric IDs and Bible references. */
export type Video = Readonly<z.infer<typeof LegacyVideoSchema>>;

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
