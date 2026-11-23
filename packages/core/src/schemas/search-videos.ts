import * as z from 'zod/mini';
import { object } from './object';
import { OrganizationIdSchema } from './organization';
import { ContentLibraryVideoSchema } from './video-resource';
import { SearchTextQuerySchema } from './search';

export const SearchVideosQuerySchema = SearchTextQuerySchema;

export const SearchVideosOptionsSchema = object({
  /** Publisher filters combined with OR. Omit or pass an empty array for no filter. */
  organizationIds: z.optional(z.readonly(z.array(OrganizationIdSchema))),
  /** Language preference. Defaults to English. */
  acceptLanguage: z.optional(z.string().check(z.minLength(1))),
  /** Results per page, from 1 through 99. */
  pageSize: z.optional(z.int().check(z.gte(1), z.lte(99))),
  /** Opaque cursor. Omit or pass null for the first page; empty strings are preserved. */
  pageToken: z.optional(z.nullable(z.string())),
});

export type SearchVideosOptions = z.infer<typeof SearchVideosOptionsSchema>;

export const SearchVideosWireSchema = object({
  videos: z.array(ContentLibraryVideoSchema),
  user_intent: z.optional(z.nullable(z.string())),
  did_you_mean: z.array(z.string()),
  search_instead_for: z.optional(z.nullable(z.string())),
  next_page_token: z.optional(z.nullable(z.string())),
});

export type SearchVideosWire = z.infer<typeof SearchVideosWireSchema>;

export const SearchVideosResponseSchema = object({
  videos: z.array(ContentLibraryVideoSchema),
  userIntent: z.optional(z.string()),
  didYouMean: z.array(z.string()),
  searchInsteadFor: z.nullable(z.string()),
  nextPageToken: z.nullable(z.string()),
});

export type SearchVideosResponse = Readonly<z.infer<typeof SearchVideosResponseSchema>>;
