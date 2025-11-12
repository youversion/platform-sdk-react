import { z } from 'zod';
import { CanonSchema, BookUsfmSchema } from './book';

/**
 * USFM identifier for the verse or passage
 */
const SearchResultItemSchema = z.object({
  /** USFM identifier for the verse or passage */
  usfm: z.string(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

/**
 * Book filter showing match count for a book in search results
 */
const SearchBookFilterSchema = z.object({
  /** Number of matches in this book */
  count: z.number().int().nonnegative(),
  /** Book identifier in USFM code (e.g. "PSA") */
  usfm: BookUsfmSchema,
});

export type SearchBookFilter = z.infer<typeof SearchBookFilterSchema>;

/**
 * Canonical section filter showing match count for a testament/section in search results
 */
const SearchCanonFilterSchema = z.object({
  /** Number of matches in this testament/section */
  count: z.number().int().nonnegative(),
  /** Canonical section identifier (e.g. "ot", "nt") */
  section: CanonSchema,
});

export type SearchCanonFilter = z.infer<typeof SearchCanonFilterSchema>;

/**
 * Aggregated match counts used for faceting (books and canons/sections)
 */
const SearchFiltersSchema = z.object({
  /** Book-level match counts */
  books: z.array(SearchBookFilterSchema),
  /** Canonical testament/section match counts */
  canons: z.array(SearchCanonFilterSchema),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Search response schema for Bible search endpoint
 */
const _SearchResponseSchema = z.object({
  /** Individual matches returned for the page */
  data: z.array(SearchResultItemSchema),
  /** Suggestions for alternative spellings */
  did_you_mean: z.array(z.string()),
  /** Aggregated match counts used for faceting */
  filters: SearchFiltersSchema,
  /** Whether there is another page of results */
  next_page: z.boolean(),
  /** Page size requested/returned */
  page_size: z.number().int().positive(),
  /** Original query string */
  query: z.string(),
  /** Suggestion for an alternative query (if any) */
  search_instead_for: z.string().nullable(),
  /** High-level inferred user intent */
  user_intent: z.string(),
});

export type SearchResponse = z.infer<typeof _SearchResponseSchema>;
