import { z } from 'zod';

// Case-insensitive: the API may echo colors in any case, and the client's input
// validator accepts both, so response parsing must not reject uppercase hex.
const HEX_COLOR_REGEX = /^[0-9a-f]{6}$/i;

/**
 * Wire format used by the highlights API (`/v1/highlights`), which names the
 * Bible version field `bible_id`. The SDK exposes it as `version_id` for
 * consistency with the rest of the public API (see {@link toHighlight}).
 */
export const HighlightWireSchema = z.object({
  /** Bible version identifier */
  bible_id: z.number().int().positive(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Hex color code (6 digits, no #) */
  color: z.string().regex(HEX_COLOR_REGEX),
});

export type HighlightWire = z.infer<typeof HighlightWireSchema>;

export const HighlightCollectionWireSchema = z.object({
  data: z.array(HighlightWireSchema),
  next_page_token: z.string().nullable().optional(),
});

export type HighlightCollectionWire = z.infer<typeof HighlightCollectionWireSchema>;

/**
 * Wire format for `GET /v1/highlights/recent-colors`, a collection of hex color
 * strings (recently used followed by default colors).
 */
export const RecentHighlightColorsWireSchema = z.object({
  data: z.array(z.object({ color: z.string().regex(HEX_COLOR_REGEX) })),
});

export type RecentHighlightColorsWire = z.infer<typeof RecentHighlightColorsWireSchema>;

const _HighlightSchema = z.object({
  /** Bible version identifier (sent to / received from the API as `bible_id`) */
  version_id: z.number().int().positive(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Hex color code (6 digits, no #) */
  color: z.string().regex(HEX_COLOR_REGEX),
});

export type Highlight = z.infer<typeof _HighlightSchema>;

/** Maps an API wire highlight (`bible_id`) to the SDK shape (`version_id`). */
export function toHighlight(wire: HighlightWire): Highlight {
  return {
    version_id: wire.bible_id,
    passage_id: wire.passage_id,
    color: wire.color,
  };
}

const _CreateHighlightSchema = z.object({
  /** Bible version identifier (sent to the API as `bible_id`) */
  version_id: z.number().int().positive(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Hex color code (6 digits, no #) */
  color: z.string().regex(HEX_COLOR_REGEX),
});

export type CreateHighlight = z.infer<typeof _CreateHighlightSchema>;
