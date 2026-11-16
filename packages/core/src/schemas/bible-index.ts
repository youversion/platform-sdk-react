import * as z from 'zod/mini';
import { object } from './object';
import { BookUsfmSchema, CanonSchema } from './book';

const BibleIndexVerseSchema = object({
  /** Verse identifier */
  id: z.string(),
  /** Passage identifier (e.g., "GEN.1.1"). */
  passage_id: z.string(),
  /** Verse title */
  title: z.string(),
});

export type BibleIndexVerse = Readonly<z.infer<typeof BibleIndexVerseSchema>>;

const BibleIndexChapterSchema = object({
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

const BibleIndexBookIntroSchema = object({
  /** Intro identifier (e.g., "INTRO") */
  id: z.string(),
  /** Passage identifier (e.g., "GEN.INTRO") */
  passage_id: z.string(),
  /** Intro title */
  title: z.string(),
});

export type BibleIndexBookIntro = Readonly<z.infer<typeof BibleIndexBookIntroSchema>>;

const BibleIndexBookSchema = object({
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
  intro: z.optional(BibleIndexBookIntroSchema),
});

export type BibleIndexBook = Readonly<z.infer<typeof BibleIndexBookSchema>>;

const _BibleIndexSchema = object({
  /** Text direction (e.g., "ltr") */
  text_direction: z.string(),
  /** Array of books with chapters and verses */
  books: z.array(BibleIndexBookSchema),
});

export type BibleIndex = Readonly<z.infer<typeof _BibleIndexSchema>>;
