import { z } from 'zod';

/** A playable video or audio source. */
export const VideoPlaybackSourceSchema = z.object({
  /** URL for the playable video or audio source. */
  url: z.string(),
  /** Source format. */
  format: z.enum(['hls', 'webm', 'mp4', 'mp3']),
});

export type VideoPlaybackSource = Readonly<z.infer<typeof VideoPlaybackSourceSchema>>;

/** A thumbnail image for a video. */
export const VideoThumbnailSchema = z.object({
  /** URL for the thumbnail image. */
  url: z.string().nullable().optional(),
  /** Thumbnail width in pixels. */
  width: z.number().int().nullable().optional(),
  /** Thumbnail height in pixels. */
  height: z.number().int().nullable().optional(),
});

export type VideoThumbnail = Readonly<z.infer<typeof VideoThumbnailSchema>>;

/** A dark-launched video resource approved for Platform consumers. */
export const VideoSchema = z.object({
  /** Video identifier. */
  id: z.number().int(),
  /** Video title. */
  title: z.string().nullable().optional(),
  /** Video description. */
  description: z.string().nullable().optional(),
  /** Bible references associated with the video (e.g., ["1SA.17.45"]). */
  references: z.array(z.string()).nullable().optional(),
  /** BCP 47 language tag for the video. */
  language_tag: z.string().nullable().optional(),
  /** Runtime in seconds. */
  runtime: z.number().int().nullable().optional(),
  /** Video orientation. */
  orientation: z.enum(['landscape', 'portrait']).nullable().optional(),
  /** Thumbnail image. */
  thumbnail: VideoThumbnailSchema.nullable().optional(),
  /** Playable video or audio sources. */
  playback_sources: z.array(VideoPlaybackSourceSchema),
  /** Preview clip sources. */
  playback_preview_sources: z.array(VideoPlaybackSourceSchema),
  /** Share URL for the video. */
  share_url: z.string().nullable().optional(),
});

export type Video = Readonly<z.infer<typeof VideoSchema>>;
