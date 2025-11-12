import { z } from 'zod';
import { BookUsfmSchema } from './book';

export const BibleVerseSchema = z.object({
  /** Verse identifier (e.g., "1") */
  id: z.string(),
  /** Book identifier (e.g., "MAT") */
  book_id: BookUsfmSchema,
  /** Chapter identifier (e.g., "1") */
  chapter_id: z.string(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Human-readable reference (e.g., "Matthew 1:1") */
  reference: z.string(),
});

export type BibleVerse = z.infer<typeof BibleVerseSchema>;
