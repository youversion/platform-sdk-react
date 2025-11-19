import { z } from 'zod';
import { BookUsfmSchema } from './book';

export const BibleVersionSchema = z.object({
  /** Bible version identifier */
  id: z.number().int(),
  /** Bible version abbreviation */
  abbreviation: z.string(),
  /** Long copyright text */
  copyright_long: z.string().nullable().optional(),
  /** Short copyright text */
  copyright_short: z.string().nullable().optional(),
  /** Bible information text */
  info: z.string().nullable().optional(),
  /** Publisher URL */
  publisher_url: z.url().nullable().optional(),
  /** Language tag (e.g., "en") */
  language_tag: z.string(),
  /** Localized abbreviation */
  local_abbreviation: z.string(),
  /** Localized title */
  local_title: z.string(),
  /** Organization ID of publisher */
  organization_id: z.string().nullable().optional(),
  /** Full title */
  title: z.string(),
  /** Array of book identifiers (e.g., ["GEN", "EXO", "LEV"]) */
  books: z.array(BookUsfmSchema),
  /** YouVersion deep link URL */
  youversion_deep_link: z.url(),
});

export type BibleVersion = z.infer<typeof BibleVersionSchema>;
