import * as z from 'zod/mini';

/** Opaque video id that can safely occupy one URL path segment. */
export const VideoIdSchema = z.string().check(
  z.refine((value) => value.trim().length > 0, 'Video ID must be a non-empty string'),
  z.refine((value) => value !== '.' && value !== '..', 'Video ID must not be a URL dot segment'),
);
