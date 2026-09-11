import * as z from 'zod/mini';

/** Known Platform Search user-intent values. Unknown wire strings remain valid. */
export const KNOWN_SEARCH_USER_INTENTS = ['unknown', 'topical', 'text', 'reference'] as const;

export type KnownSearchUserIntent = (typeof KNOWN_SEARCH_USER_INTENTS)[number];

const USFM_REFERENCE_PATTERN = /^([A-Z0-9]{1,3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/;

/**
 * Structural USFM reference check for search verse hits.
 * Rejects malformed references and non-positive chapter/verse numbers.
 * Does not validate book codes against {@link BOOK_IDS}.
 */
export function isValidStructuralUsfmReference(usfm: string): boolean {
  const match = USFM_REFERENCE_PATTERN.exec(usfm);
  if (!match) {
    return false;
  }

  const chapter = Number(match[2]);
  if (!Number.isInteger(chapter) || chapter <= 0) {
    return false;
  }

  if (match[3] !== undefined) {
    const verse = Number(match[3]);
    if (!Number.isInteger(verse) || verse <= 0) {
      return false;
    }
  }

  if (match[4] !== undefined) {
    const verseEnd = Number(match[4]);
    if (!Number.isInteger(verseEnd) || verseEnd <= 0) {
      return false;
    }
  }

  return true;
}

/** Normalizes caller language ranges for search endpoints (`en_US` → `en-US`). */
export function normalizeSearchLanguageRange(range: string): string {
  return range.trim().replace(/_/g, '-');
}

const SEARCH_LANGUAGE_RANGE_REGEX = /^(\*|[a-z]{2,3}(?:-[A-Za-z0-9]+)*)$/;

const SEARCH_LANGUAGE_RANGE_ERROR =
  'Language range must be "*" or a Basic Language Range (e.g., "en", "en-US")';

/** Validates and normalizes one search language range (`en_US` → `en-US`). */
export function parseSearchLanguageRange(range: string): string {
  const trimmed = z
    .string()
    .check(z.trim(), z.minLength(1, 'Language ranges must be a non-empty string'))
    .parse(range);
  const normalized = normalizeSearchLanguageRange(trimmed);
  z.string()
    .check(z.regex(SEARCH_LANGUAGE_RANGE_REGEX, SEARCH_LANGUAGE_RANGE_ERROR))
    .parse(normalized);
  return normalized;
}

/** Validates and normalizes one or more search language ranges. */
export function parseLanguageRanges(languageRanges: string | string[]): string[] {
  const rangeArray = Array.isArray(languageRanges) ? languageRanges : [languageRanges];
  z.array(z.string())
    .check(z.minLength(1, 'At least one language range is required'))
    .parse(rangeArray);
  return rangeArray.map(parseSearchLanguageRange);
}

export const SearchQuerySchema = z.object({
  /** Suggested or trending query text */
  text: z.string(),
  /** Optional opaque source label from the API */
  source: z.optional(z.string()),
});

export type SearchQuery = Readonly<z.infer<typeof SearchQuerySchema>>;

export const SearchQueriesSchema = z.object({
  /** Ordered query suggestions or trending queries */
  queries: z.array(SearchQuerySchema),
});

export type SearchQueries = Readonly<z.infer<typeof SearchQueriesSchema>>;

export const SearchQueryWireSchema = z.object({
  text: z.string(),
  source: z.optional(z.string()),
});

export type SearchQueryWire = z.infer<typeof SearchQueryWireSchema>;

export const SearchQueriesWireSchema = z.object({
  data: z.array(SearchQueryWireSchema),
});

export type SearchQueriesWire = z.infer<typeof SearchQueriesWireSchema>;

export function toSearchQuery(wire: SearchQueryWire): SearchQuery {
  const query: SearchQuery = { text: wire.text };
  if (wire.source !== undefined) {
    return { ...query, source: wire.source };
  }
  return query;
}

/** Verse search hit; `id` is USFM and matches {@link BiblePassage.id} semantics. */
export const SearchVerseHitSchema = z.object({
  /** USFM passage identifier (e.g., "JHN.6.9") */
  id: z.string(),
});

export type SearchVerseHit = Readonly<z.infer<typeof SearchVerseHitSchema>>;

export const SearchVersesResponseSchema = z.object({
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

export const SearchVerseHitWireSchema = z.object({
  /** USFM reference on the wire (mapped to SDK `id`) */
  reference: z.string(),
});

export type SearchVerseHitWire = z.infer<typeof SearchVerseHitWireSchema>;

export const SearchVersesWireSchema = z.object({
  verses: z.array(SearchVerseHitWireSchema),
  user_intent: z.optional(z.string()),
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
  if (wire.user_intent !== undefined) {
    return { ...response, userIntent: wire.user_intent };
  }
  return response;
}

export const SearchTopicSchema = z.object({
  /** Nullable catalog identifier */
  id: z.optional(z.nullable(z.int())),
  /** Topic label */
  text: z.string(),
  /** Related subtopic labels */
  subtopics: z.array(z.string()),
});

export type SearchTopic = Readonly<z.infer<typeof SearchTopicSchema>>;

export const SearchTopicsResponseSchema = z.object({
  /** Complete unpaginated topic collection */
  topics: z.array(SearchTopicSchema),
  didYouMean: z.array(z.string()),
  searchInsteadFor: z.optional(z.nullable(z.string())),
  /** Total topics in this response (not a pagination total) */
  totalSize: z.int(),
});

export type SearchTopicsResponse = Readonly<z.infer<typeof SearchTopicsResponseSchema>>;

export const SearchTopicWireSchema = z.object({
  id: z.optional(z.nullable(z.int())),
  text: z.string(),
  subtopics: z.array(z.string()),
});

export type SearchTopicWire = z.infer<typeof SearchTopicWireSchema>;

export const SearchTopicsWireSchema = z.object({
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

/** Input validation for verse/topic search queries (1–100 characters). */
export const SearchTextQuerySchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Query must be between 1 and 100 characters'),
    z.maxLength(100, 'Query must be between 1 and 100 characters'),
  );

/** Input validation for suggested-query partial text (non-empty). */
export const SuggestedSearchQuerySchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Query must be a non-empty string'));

export const SearchVersesOptionsSchema = z.object({
  userIntent: z.optional(z.string()),
  pageSize: z.optional(z.int().check(z.gte(1), z.lte(99))),
  pageToken: z.optional(z.string()),
});

export type SearchVersesOptions = z.infer<typeof SearchVersesOptionsSchema>;
