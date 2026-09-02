import * as z from 'zod/mini';
import { BookUsfmSchema } from './book';

export const BibleVersionSchema = z.object({
  /** Bible version identifier */
  id: z.int(),
  /** Bible version abbreviation */
  abbreviation: z.string(),
  /** Long copyright text */
  promotional_content: z.optional(z.nullable(z.string())),
  /** Short copyright text */
  copyright: z.optional(z.nullable(z.string())),
  /** Bible information text */
  info: z.optional(z.nullable(z.string())),
  /** Publisher URL (may be an empty string when not provided) */
  publisher_url: z.optional(z.nullable(z.string())),
  /** Language tag (e.g., "en") */
  language_tag: z.string(),
  /** Localized abbreviation */
  localized_abbreviation: z.string(),
  /** Localized title */
  localized_title: z.string(),
  /** Organization ID of publisher */
  organization_id: z.optional(z.nullable(z.string())),
  /** Full title */
  title: z.string(),
  /** Array of book identifiers (e.g., ["GEN", "EXO", "LEV"]) */
  books: z.array(BookUsfmSchema),
  /** YouVersion deep link URL */
  youversion_deep_link: z.url(),
});

export type BibleVersion = Readonly<z.infer<typeof BibleVersionSchema>>;
