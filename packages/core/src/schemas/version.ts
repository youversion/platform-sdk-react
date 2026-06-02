import { z } from 'zod';
import { BookUsfmSchema } from './book';

export const BibleVersionSchema = z.object({
  /** Bible version identifier */
  id: z.number().int(),
  /** Bible version abbreviation */
  abbreviation: z.string(),
  /** Long copyright text */
  promotional_content: z.string().nullable().optional(),
  /** Short copyright text */
  copyright: z.string().nullable().optional(),
  /** Bible information text */
  info: z.string().nullable().optional(),
  /** Publisher URL (may be an empty string when not provided) */
  publisher_url: z.string().nullable().optional(),
  /** Language tag (e.g., "en") */
  language_tag: z.string(),
  /** Localized abbreviation */
  localized_abbreviation: z.string(),
  /** Localized title */
  localized_title: z.string(),
  /** Organization ID of publisher */
  organization_id: z.string().nullable().optional(),
  /** Full title */
  title: z.string(),
  /** Array of book identifiers (e.g., ["GEN", "EXO", "LEV"]) */
  books: z.array(BookUsfmSchema),
  /** YouVersion deep link URL */
  youversion_deep_link: z.url(),
});

export type BibleVersion = Readonly<z.infer<typeof BibleVersionSchema>>;
