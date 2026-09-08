import * as z from 'zod/mini';
import { BibleVerseSchema } from './verse';

export const BibleChapterSchema = z.object({
  /** Chapter identifier (e.g., "1") */
  id: z.string(),
  /** Passage identifier (e.g., "MAT.1") */
  passage_id: z.string(),
  /** Chapter title (e.g., "1") */
  title: z.string(),
  /** Array of verses */
  verses: z.optional(z.array(BibleVerseSchema)),
});

export type BibleChapter = Readonly<z.infer<typeof BibleChapterSchema>>;

/** Input validation for a caller-supplied chapter number. */
export const BibleChapterNumberSchema = z
  .int({ error: 'Chapter must be an integer' })
  .check(z.positive('Chapter must be a positive integer'));
