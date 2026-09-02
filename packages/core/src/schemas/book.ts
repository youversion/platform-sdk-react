import * as z from 'zod/mini';
import { BOOK_IDS, CANON_IDS } from '../utils/constants';
import { BibleChapterSchema } from './chapter';

export const CanonSchema = z.enum(CANON_IDS);

const BibleBookIntroSchema = z.object({
  /** Intro identifier */
  id: z.string(),
  /** Intro passage identifier */
  passage_id: z.string(),
  /** Intro title */
  title: z.string(),
});
export type BibleBookIntro = Readonly<z.infer<typeof BibleBookIntroSchema>>;

// https://github.com/colinhacks/zod/discussions/4934#discussioncomment-13858053
const OpenBookUsfmSchema: z.ZodMiniType<string & {}> = z.string().check(z.length(3));
export const BookUsfmSchema = z.union([...BOOK_IDS.map((id) => z.literal(id)), OpenBookUsfmSchema]);

export const BibleBookSchema = z.object({
  /** Book identifier (e.g., "MAT") */
  id: BookUsfmSchema,
  /** Book title (e.g., "Genesis") */
  title: z.string(),
  /** Full Book title (e.g., "The First Book of Moses, Commonly Called Genesis") */
  full_title: z.string(),
  /** Book abbreviation (e.g., "Gen") */
  abbreviation: z.optional(z.string()),
  /** Canonical section (new_testament, old_testament, deuterocanon) */
  canon: CanonSchema,
  /** Intro metadata (optional) */
  intro: z.optional(BibleBookIntroSchema),
  /** Array of chapter identifiers (e.g., ["GEN.1", "GEN.2", "GEN.3"]) */
  chapters: z.optional(z.array(BibleChapterSchema)),
});

export type BibleBook = Readonly<z.infer<typeof BibleBookSchema>>;
export type CANON = Readonly<z.infer<typeof CanonSchema>>;
