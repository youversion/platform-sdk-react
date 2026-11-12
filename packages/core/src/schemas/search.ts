import * as z from 'zod/mini';
import { object } from './object';
import { parseUsfmReference } from '../usfm-reference';

export const MAX_SEARCH_QUERY_GRAPHEMES = 100;

let searchTextSegmenter: Intl.Segmenter | undefined;

/** Truncates to 100 graphemes, or Unicode code points when Intl.Segmenter is unavailable. */
export function clampSearchText(raw: string): string {
  if (Intl.Segmenter === undefined) {
    return Array.from(raw).slice(0, MAX_SEARCH_QUERY_GRAPHEMES).join('');
  }
  searchTextSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const segments = searchTextSegmenter.segment(raw)[Symbol.iterator]();
  let end = 0;
  for (let count = 0; count < MAX_SEARCH_QUERY_GRAPHEMES; count += 1) {
    const next = segments.next();
    if (next.done) {
      return raw;
    }
    end = next.value.index + next.value.segment.length;
  }
  return raw.slice(0, end);
}

/** Known Platform Search user-intent values. Unknown wire strings remain valid. */
export const KNOWN_SEARCH_USER_INTENTS = ['unknown', 'topical', 'text', 'reference'] as const;

export type KnownSearchUserIntent = (typeof KNOWN_SEARCH_USER_INTENTS)[number];

/**
 * Structural USFM reference check for search verse hits.
 * Rejects malformed references and non-positive chapter/verse numbers.
 * Does not validate book codes against {@link BOOK_IDS}.
 *
 * Kept separate from UI `expandPassageId` (`packages/ui`): that helper requires a
 * verse segment, rejects reversed ranges and oversized spans, and lives behind the
 * core → hooks → ui boundary. Search needs chapter-only ids and unknown book codes
 * (for example `ZZZ.1.1`) so bad hits drop without throwing while good hits stay.
 */
export function isValidStructuralUsfmReference(usfm: string): boolean {
  return parseUsfmReference(usfm) !== null;
}

export const SearchQuerySchema = object({
  /** Suggested or trending query text */
  text: z.string(),
  /** Optional opaque source label from the API */
  source: z.optional(z.string()),
});

export type SearchQuery = Readonly<z.infer<typeof SearchQuerySchema>>;

export const SearchQueriesSchema = object({
  /** Ordered query suggestions or trending queries */
  queries: z.array(SearchQuerySchema),
});

export type SearchQueries = Readonly<z.infer<typeof SearchQueriesSchema>>;

export const SearchQueryWireSchema = object({
  text: z.string(),
  source: z.optional(z.nullable(z.string())),
});

export type SearchQueryWire = z.infer<typeof SearchQueryWireSchema>;

export const SearchQueriesWireSchema = object({
  data: z.array(SearchQueryWireSchema),
});

export type SearchQueriesWire = z.infer<typeof SearchQueriesWireSchema>;

export function toSearchQuery(wire: SearchQueryWire): SearchQuery {
  const query: SearchQuery = { text: wire.text };
  if (wire.source != null) {
    return { ...query, source: wire.source };
  }
  return query;
}

/** Verse search hit; `id` is USFM and matches {@link BiblePassage.id} semantics. */
export const SearchVerseHitSchema = object({
  /** USFM passage identifier (e.g., "JHN.6.9") */
  id: z.string(),
});

export type SearchVerseHit = Readonly<z.infer<typeof SearchVerseHitSchema>>;

export const SearchVersesResponseSchema = object({
  /** Ordered verse hits with malformed references removed */
  verses: z.array(SearchVerseHitSchema),
  /** Classified user intent when returned by the API */
  userIntent: z.optional(z.string()),
  /** Alternative spellings suggested for the query */
  didYouMean: z.array(z.string()),
  /** Corrected query used to produce results, when applicable */
  searchInsteadFor: z.optional(z.nullable(z.string())),
  /** Opaque continuation token for the next page */
  nextPageToken: z.optional(z.nullable(z.string())),
});

export type SearchVersesResponse = Readonly<z.infer<typeof SearchVersesResponseSchema>>;

export const SearchVerseHitWireSchema = object({
  /** USFM reference on the wire (mapped to SDK `id`) */
  reference: z.string(),
});

export type SearchVerseHitWire = z.infer<typeof SearchVerseHitWireSchema>;

export const SearchVersesWireSchema = object({
  verses: z.array(SearchVerseHitWireSchema),
  user_intent: z.optional(z.nullable(z.string())),
  did_you_mean: z.array(z.string()),
  search_instead_for: z.optional(z.nullable(z.string())),
  next_page_token: z.optional(z.nullable(z.string())),
});

export type SearchVersesWire = z.infer<typeof SearchVersesWireSchema>;

export function toSearchVerseHit(wire: SearchVerseHitWire): SearchVerseHit | null {
  if (!isValidStructuralUsfmReference(wire.reference)) {
    return null;
  }
  return { id: wire.reference };
}

export function toSearchVersesResponse(wire: SearchVersesWire): SearchVersesResponse {
  const verses = wire.verses
    .map(toSearchVerseHit)
    .filter((hit): hit is SearchVerseHit => hit !== null);

  const response: SearchVersesResponse = {
    verses,
    didYouMean: wire.did_you_mean,
    searchInsteadFor: wire.search_instead_for ?? null,
    nextPageToken: wire.next_page_token ?? null,
  };
  if (wire.user_intent != null) {
    return { ...response, userIntent: wire.user_intent };
  }
  return response;
}

export const SearchTopicSchema = object({
  /** Nullable catalog identifier */
  id: z.optional(z.nullable(z.int())),
  /** Topic label */
  text: z.string(),
  /** Related subtopic labels */
  subtopics: z.array(z.string()),
});

export type SearchTopic = Readonly<z.infer<typeof SearchTopicSchema>>;

export const SearchTopicsResponseSchema = object({
  /** Complete unpaginated topic collection */
  topics: z.array(SearchTopicSchema),
  didYouMean: z.array(z.string()),
  searchInsteadFor: z.optional(z.nullable(z.string())),
  /** Total topics in this response (not a pagination total) */
  totalSize: z.int(),
});

export type SearchTopicsResponse = Readonly<z.infer<typeof SearchTopicsResponseSchema>>;

export const SearchTopicWireSchema = object({
  id: z.optional(z.nullable(z.int())),
  text: z.string(),
  subtopics: z.array(z.string()),
});

export type SearchTopicWire = z.infer<typeof SearchTopicWireSchema>;

export const SearchTopicsWireSchema = object({
  topics: z.array(SearchTopicWireSchema),
  did_you_mean: z.array(z.string()),
  search_instead_for: z.optional(z.nullable(z.string())),
  total_size: z.int(),
});

export type SearchTopicsWire = z.infer<typeof SearchTopicsWireSchema>;

export function toSearchTopic(wire: SearchTopicWire): SearchTopic {
  const topic: SearchTopic = {
    text: wire.text,
    subtopics: wire.subtopics,
  };
  if (wire.id !== undefined) {
    return { ...topic, id: wire.id };
  }
  return topic;
}

export function toSearchTopicsResponse(wire: SearchTopicsWire): SearchTopicsResponse {
  return {
    topics: wire.topics.map(toSearchTopic),
    didYouMean: wire.did_you_mean,
    searchInsteadFor: wire.search_instead_for ?? null,
    totalSize: wire.total_size,
  };
}

/** Input validation for verse/topic search queries (1–100 grapheme clusters). */
export const SearchTextQuerySchema = z.string().check(
  z.trim(),
  z.minLength(1, 'Query must be between 1 and 100 characters'),
  z.refine(
    (value) => clampSearchText(value) === value,
    'Query must be between 1 and 100 characters',
  ),
);

/** Input validation for suggested-query partial text (non-empty). */
export const SuggestedSearchQuerySchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Query must be a non-empty string'));

export const SearchVersesOptionsSchema = object({
  userIntent: z.optional(z.string()),
  pageSize: z.optional(z.int().check(z.gte(1), z.lte(99))),
  pageToken: z.optional(z.string()),
});

export type SearchVersesOptions = z.infer<typeof SearchVersesOptionsSchema>;

const SEARCH_UNIFIED_FIELDS = ['verses', 'topics', 'images'] as const;

export type SearchUnifiedField = (typeof SEARCH_UNIFIED_FIELDS)[number];

const SearchUnifiedFieldSchema = z.enum(SEARCH_UNIFIED_FIELDS, {
  error: 'Search field must be verses, topics, or images',
});

const SearchUnifiedFieldsSchema = z.pipe(
  z.array(SearchUnifiedFieldSchema).check(z.minLength(1, 'At least one search field is required')),
  z.transform((fields) => [...new Set(fields)]),
);

export const SearchUnifiedOptionsSchema = object({
  /** Omit to use the service default, `unknown`. */
  userIntent: z.optional(z.enum(KNOWN_SEARCH_USER_INTENTS)),
  fields: z.optional(SearchUnifiedFieldsSchema),
});

type SearchUnifiedOptionsParsed = z.infer<typeof SearchUnifiedOptionsSchema>;

export type SearchUnifiedOptions = Readonly<{
  userIntent?: SearchUnifiedOptionsParsed['userIntent'];
  fields?: readonly SearchUnifiedField[];
}>;

const SearchUnifiedTopicHitWireSchema = z.extend(SearchTopicWireSchema, {
  id: z.nullable(z.int()),
});

export type SearchUnifiedTopicHitWire = z.infer<typeof SearchUnifiedTopicHitWireSchema>;

export const SearchImageHitSchema = object({
  id: z.string().check(z.minLength(1)),
  passageId: z.string().check(z.minLength(1)),
});

export type SearchImageHit = Readonly<z.infer<typeof SearchImageHitSchema>>;

const SearchImageHitWireSchema = object({
  id: z.string(),
  passage_id: z.string(),
});

type SearchImageHitWire = z.infer<typeof SearchImageHitWireSchema>;

export const SearchUnifiedWireSchema = object({
  verses: z.optional(z.array(z.unknown())),
  topics: z.optional(z.array(z.unknown())),
  user_intent: z.optional(z.nullable(z.string())),
  did_you_mean: z.optional(z.array(z.string())),
  search_instead_for: z.optional(z.nullable(z.string())),
  images: z.optional(z.array(z.unknown())),
});

export type SearchUnifiedWire = z.infer<typeof SearchUnifiedWireSchema>;

export const SearchUnifiedResponseSchema = object({
  /** Verse hits. Malformed USFM references are removed. */
  verses: z.array(SearchVerseHitSchema),
  topics: z.array(SearchTopicSchema),
  /** Image hits. Empty id or invalid `passageId` entries are removed. */
  images: z.array(SearchImageHitSchema),
  /** Set only when the API returns a non-null user intent. */
  userIntent: z.optional(z.string()),
  didYouMean: z.array(z.string()),
  searchInsteadFor: z.nullable(z.string()),
});

export type SearchUnifiedResponse = Readonly<z.infer<typeof SearchUnifiedResponseSchema>>;

type EnsureSearchUnifiedFieldArrays<T extends Record<SearchUnifiedField, true>> = T;

type _SearchUnifiedFieldCoverage = EnsureSearchUnifiedFieldArrays<{
  [K in SearchUnifiedField]: SearchUnifiedResponse[K] extends readonly unknown[] ? true : false;
}>;

function toSearchImageHit(wire: SearchImageHitWire): SearchImageHit | null {
  if (wire.id.length === 0 || !isValidStructuralUsfmReference(wire.passage_id)) {
    return null;
  }
  return {
    id: wire.id,
    passageId: wire.passage_id,
  };
}

function searchImageHits(hits: readonly unknown[]): SearchImageHit[] {
  return hits.flatMap((hit) => {
    const parsed = SearchImageHitWireSchema.safeParse(hit);
    if (!parsed.success) {
      return [];
    }
    const image = toSearchImageHit(parsed.data);
    return image === null ? [] : [image];
  });
}

export const SearchImagesOptionsSchema = object({
  pageSize: z.optional(z.int().check(z.gte(1), z.lte(99))),
  pageToken: z.optional(z.string()),
});

export type SearchImagesOptions = z.infer<typeof SearchImagesOptionsSchema>;

export const SearchImagesWireSchema = object({
  images: z.array(z.unknown()),
  next_page_token: z.optional(z.nullable(z.string())),
});

export type SearchImagesWire = z.infer<typeof SearchImagesWireSchema>;

export const SearchImagesResponseSchema = object({
  images: z.array(SearchImageHitSchema),
  nextPageToken: z.nullable(z.string()),
});

export type SearchImagesResponse = Readonly<z.infer<typeof SearchImagesResponseSchema>>;

export function toSearchImagesResponse(wire: SearchImagesWire): SearchImagesResponse {
  return {
    images: searchImageHits(wire.images),
    nextPageToken: wire.next_page_token ?? null,
  };
}

export function toSearchUnifiedResponse(wire: SearchUnifiedWire): SearchUnifiedResponse {
  const response: SearchUnifiedResponse = {
    verses: (wire.verses ?? []).flatMap((hit) => {
      const parsed = SearchVerseHitWireSchema.safeParse(hit);
      if (!parsed.success) {
        return [];
      }
      const verse = toSearchVerseHit(parsed.data);
      return verse === null ? [] : [verse];
    }),
    topics: (wire.topics ?? []).flatMap((hit) => {
      const parsed = SearchUnifiedTopicHitWireSchema.safeParse(hit);
      if (!parsed.success) {
        return [];
      }
      return [toSearchTopic(parsed.data)];
    }),
    images: searchImageHits(wire.images ?? []),
    didYouMean: wire.did_you_mean ?? [],
    searchInsteadFor: wire.search_instead_for ?? null,
  };
  if (wire.user_intent != null) {
    return { ...response, userIntent: wire.user_intent };
  }
  return response;
}
