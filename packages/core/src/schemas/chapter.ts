import { z } from 'zod';
import { BibleVerseSchema } from './verse';

export const BibleChapterSchema = z.object({
  /** Chapter identifier (e.g., "1") */
  id: z.string(),
  /** Passage identifier (e.g., "MAT.1") */
  passage_id: z.string(),
  /** Chapter title (e.g., "1") */
  title: z.string(),
  /** Array of verses */
  verses: z.array(BibleVerseSchema).optional(),
});

export type BibleChapter = Readonly<z.infer<typeof BibleChapterSchema>>;
