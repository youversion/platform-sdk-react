import { z } from 'zod';
import { BookUsfmSchema, CanonSchema } from './book';

const BibleIndexVerseSchema = z.object({
  /** Verse identifier */
  id: z.string(),
  /** Passage identifier (e.g., "GEN.1.1"). */
  passage_id: z.string(),
  /** Verse title */
  title: z.string(),
});

export type BibleIndexVerse = Readonly<z.infer<typeof BibleIndexVerseSchema>>;

const BibleIndexChapterSchema = z.object({
  /** Chapter identifier */
  id: z.string(),
  /** Passage identifier (e.g., "GEN.1"). */
  passage_id: z.string(),
  /** Chapter title */
  title: z.string(),
  /** Array of verses in this chapter */
  verses: z.array(BibleIndexVerseSchema),
});

export type BibleIndexChapter = Readonly<z.infer<typeof BibleIndexChapterSchema>>;

const BibleIndexBookIntroSchema = z.object({
  /** Intro identifier (e.g., "INTRO") */
  id: z.string(),
  /** Passage identifier (e.g., "GEN.INTRO") */
  passage_id: z.string(),
  /** Intro title */
  title: z.string(),
});

export type BibleIndexBookIntro = Readonly<z.infer<typeof BibleIndexBookIntroSchema>>;

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
  /** Intro metadata (optional) */
  intro: BibleIndexBookIntroSchema.optional(),
});

export type BibleIndexBook = Readonly<z.infer<typeof BibleIndexBookSchema>>;

const _BibleIndexSchema = z.object({
  /** Text direction (e.g., "ltr") */
  text_direction: z.string(),
  /** Array of books with chapters and verses */
  books: z.array(BibleIndexBookSchema),
});

export type BibleIndex = Readonly<z.infer<typeof _BibleIndexSchema>>;
