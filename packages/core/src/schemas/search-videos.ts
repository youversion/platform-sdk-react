import * as z from 'zod/mini';
import { object } from './object';
import { OrganizationIdSchema } from './organization';
import { VideoSchema } from './video';

export const SearchVideosQuerySchema = z.string().check(
  z.trim(),
  z.minLength(1, 'Query must be between 1 and 100 characters'),
  z.refine(
    (value) => Array.from(value).length <= 100,
    'Query must be between 1 and 100 characters',
  ),
);

export const SearchVideosOptionsSchema = object({
  /** Publisher filters combined with OR. */
  organizationIds: z.optional(z.readonly(z.array(OrganizationIdSchema).check(z.minLength(1)))),
  /** Language preference. Defaults to English. */
  acceptLanguage: z.optional(z.string().check(z.minLength(1))),
  pageSize: z.optional(z.int().check(z.gte(1), z.lte(99))),
  pageToken: z.optional(z.string()),
});

export type SearchVideosOptions = z.infer<typeof SearchVideosOptionsSchema>;

export const SearchVideosWireSchema = object({
  videos: z.array(VideoSchema),
  user_intent: z.nullable(z.string()),
  did_you_mean: z.array(z.string()),
  search_instead_for: z.nullable(z.string()),
  next_page_token: z.optional(z.nullable(z.string())),
});

export type SearchVideosWire = z.infer<typeof SearchVideosWireSchema>;

export const SearchVideosResponseSchema = object({
  videos: z.array(VideoSchema),
  userIntent: z.optional(z.string()),
  didYouMean: z.array(z.string()),
  searchInsteadFor: z.nullable(z.string()),
  nextPageToken: z.nullable(z.string()),
});

export type SearchVideosResponse = Readonly<z.infer<typeof SearchVideosResponseSchema>>;
