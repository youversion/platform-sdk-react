import { z } from 'zod';
import { BookUsfmSchema } from './book';

export const BibleChapterSchema = z.object({
  /** Chapter identifier (e.g., "1") */
  id: z.string(),
  /** Book identifier (e.g., "MAT") */
  book_id: BookUsfmSchema,
  /** Passage identifier (e.g., "MAT.1") */
  passage_id: z.string(),
  /** Chapter title (e.g., "1") */
  title: z.string(),
  /** Array of verse identifiers (e.g., ["1", "2", "3"]) */
  verses: z
    .array(
      z
        .string()
        .regex(/^\d+$/, { message: 'Verse must be an integer string' })
        .transform((val) => val as `${number}`),
    )
    .optional(),
});

export type BibleChapter = z.infer<typeof BibleChapterSchema>;
