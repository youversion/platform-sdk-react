import * as z from 'zod/mini';
import { object } from './object';
import { VideoIdSchema } from './video-id';

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
  url: z.optional(z.nullable(z.string())),
  /** Thumbnail width in pixels. */
  width: z.optional(z.nullable(z.int())),
  /** Thumbnail height in pixels. */
  height: z.optional(z.nullable(z.int())),
});

export type VideoThumbnail = Readonly<z.infer<typeof VideoThumbnailSchema>>;

/** Metadata shared by Content Library resources and the legacy v3 video model. */
export const VideoFields = {
  /** Bible references supplied by older video catalogs. */
  references: z.optional(z.nullable(z.array(z.string()))),
  /** Video title. */
  title: z.optional(z.nullable(z.string())),
  /** Video description. */
  description: z.optional(z.nullable(z.string())),
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
};

/** Full Content Library video returned by video detail and dedicated search. */
export const ContentLibraryVideoSchema = object({
  ...VideoFields,
  /** Opaque video identifier. Pass it to `VideosClient.getVideo` unchanged. */
  id: VideoIdSchema,
  /** Bible passage associated with the video (e.g., `1SA.17.45`). */
  passage_id: z.optional(z.nullable(z.string())),
  /** Bible passages associated with the video in the newer resource contract. */
  passage_ids: z.optional(z.nullable(z.array(z.string()))),
  /** Publisher organization identifier. */
  organization_id: z.optional(z.nullable(z.uuid())),
});

export type ContentLibraryVideo = Readonly<z.infer<typeof ContentLibraryVideoSchema>>;
