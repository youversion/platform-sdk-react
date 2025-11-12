import { z } from 'zod';
import { BookUsfmSchema, CanonSchema } from './book';

const BibleIndexVerseSchema = z.object({
  /** Verse identifier */
  id: z.string(),
  /** Verse title */
  title: z.string(),
});

export type BibleIndexVerse = z.infer<typeof BibleIndexVerseSchema>;

const BibleIndexChapterSchema = z.object({
  /** Chapter identifier */
  id: z.string(),
  /** Chapter title */
  title: z.string(),
  /** Array of verses in this chapter */
  verses: z.array(BibleIndexVerseSchema),
});

export type BibleIndexChapter = z.infer<typeof BibleIndexChapterSchema>;

const BibleIndexBookSchema = z.object({
  /** Book identifier */
  id: BookUsfmSchema,
  /** Book title */
  title: z.string(),
  /** Full book title */
  full_title: z.string(),
  /** Book abbreviation */
  abbreviation: z.string(),
  /** Canonical section */
  canon: CanonSchema,
  /** Array of chapters in this book */
  chapters: z.array(BibleIndexChapterSchema),
});

export type BibleIndexBook = z.infer<typeof BibleIndexBookSchema>;

const _BibleIndexSchema = z.object({
  /** Text direction (e.g., "ltr") */
  text_direction: z.string(),
  /** Array of books with chapters and verses */
  books: z.array(BibleIndexBookSchema),
});

export type BibleIndex = z.infer<typeof _BibleIndexSchema>;
