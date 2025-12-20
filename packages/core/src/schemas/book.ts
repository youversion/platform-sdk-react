import { z } from 'zod';
import { BOOK_IDS } from '../utils/constants';
import { BibleChapterSchema } from './chapter';

export const CanonSchema = z.enum(['old_testament', 'new_testament', 'deuterocanon']);
export type Canon = Readonly<z.infer<typeof CanonSchema>>;

export const BibleBookIntroSchema = z.object({
  /** Intro identifier */
  id: z.string(),
  /** Intro passage identifier */
  passage_id: z.string(),
  /** Intro title */
  title: z.string(),
});
export type BibleBookIntro = Readonly<z.infer<typeof BibleBookIntroSchema>>;

// https://github.com/colinhacks/zod/discussions/4934#discussioncomment-13858053
export const BookUsfmSchema = z.union([
  ...BOOK_IDS.map((id) => z.literal(id)),
  z.string().length(3) as z.ZodType<string & {}>,
]);
export type BookUsfm = z.infer<typeof BookUsfmSchema>;

export const BibleBookSchema = z.object({
  /** Book identifier (e.g., "MAT") */
  id: BookUsfmSchema,
  /** Book title (e.g., "Genesis") */
  title: z.string(),
  /** Full Book title (e.g., "The First Book of Moses, Commonly Called Genesis") */
  full_title: z.string(),
  /** Book abbreviation (e.g., "Gen") */
  abbreviation: z.string().optional(),
  /** Canonical section (new_testament, old_testament, deuterocanon) */
  canon: CanonSchema,
  /** Intro metadata (optional) */
  intro: BibleBookIntroSchema.optional(),
  /** Array of chapter identifiers (e.g., ["GEN.1", "GEN.2", "GEN.3"]) */
  chapters: z.array(BibleChapterSchema).optional(),
});

export type BibleBook = Readonly<z.infer<typeof BibleBookSchema>>;
export type CANON = Readonly<z.infer<typeof CanonSchema>>;
