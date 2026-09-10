import * as z from 'zod/mini';

/** A playable video or audio source. */
export const VideoPlaybackSourceSchema = z.object({
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
export const VideoThumbnailSchema = z.object({
  /** URL for the thumbnail image. */
  url: z.optional(z.nullable(z.string())),
  /** Thumbnail width in pixels. */
  width: z.optional(z.nullable(z.int())),
  /** Thumbnail height in pixels. */
  height: z.optional(z.nullable(z.int())),
});

export type VideoThumbnail = Readonly<z.infer<typeof VideoThumbnailSchema>>;

/** A dark-launched video resource approved for Platform consumers. */
export const VideoSchema = z.object({
  /** Video identifier. */
  id: z.int(),
  /** Video title. */
  title: z.optional(z.nullable(z.string())),
  /** Video description. */
  description: z.optional(z.nullable(z.string())),
  /** Bible references associated with the video (e.g., ["1SA.17.45"]). */
  references: z.optional(z.nullable(z.array(z.string()))),
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
