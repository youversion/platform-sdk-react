import * as z from 'zod/mini';

export const BibleVerseSchema = z.object({
  /** Verse identifier (e.g., "1") */
  id: z.string(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Verse Number (e.g., "1") */
  title: z.string(),
});

export type BibleVerse = Readonly<z.infer<typeof BibleVerseSchema>>;

/** Input validation for a caller-supplied verse number. */
export const BibleVerseNumberSchema = z
  .int({ error: 'Verse must be an integer' })
  .check(z.positive('Verse must be a positive integer'));
