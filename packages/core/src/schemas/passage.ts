import { z } from 'zod';
import type { VerseNotes } from '../bible-html-transformer';

export const BiblePassageSchema = z.object({
  /** Passage identifier (e.g., "MAT.1.1") */
  id: z.string(),
  /** Passage content text */
  content: z.string(),
  /** Human-readable reference (e.g., "Matthew 1:1") */
  reference: z.string(),
});

export type BiblePassage = Readonly<z.infer<typeof BiblePassageSchema>>;

export type TransformedBiblePassage = BiblePassage & {
  /** Original untransformed HTML content from the API */
  rawContent: string;
  /** Extracted footnote data keyed by verse number or intro key */
  notes: Record<string, VerseNotes>;
};
