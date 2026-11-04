import * as z from 'zod/mini';

/** Normalizes caller language ranges for search endpoints (`en_US` → `en-us`). */
export function normalizeSearchLanguageRange(range: string): string {
  return range.trim().replace(/_/g, '-').toLowerCase();
}

/**
 * Platform Search `language_ranges[]` filter grammar: `*` or a Basic Language Range
 * subset (ISO 639 primary subtag plus optional hyphen extensions such as region).
 * Not full BCP 47. Language API resource ids use {@link BCP47_LANGUAGE_TAG_REGEX}.
 */
const SEARCH_LANGUAGE_RANGE_REGEX = /^(\*|[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*)$/;

const SEARCH_LANGUAGE_RANGE_ERROR =
  'Language range must be "*" or a Basic Language Range (e.g., "en", "en-US")';

/** Validates and normalizes one search language range (`EN`, `en_US` → `en`, `en-us`). */
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
export function parseLanguageRanges(languageRanges: string | readonly string[]): string[] {
  const rangeArray = Array.isArray(languageRanges) ? [...languageRanges] : [languageRanges];
  z.array(z.string())
    .check(z.minLength(1, 'At least one language range is required'))
    .parse(rangeArray);
  return rangeArray.map(parseSearchLanguageRange);
}
