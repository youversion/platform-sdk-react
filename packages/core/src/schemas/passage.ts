import * as z from 'zod/mini';

export const BiblePassageSchema = z.object({
  /** Passage identifier (e.g., "MAT.1.1") */
  id: z.string(),
  /** Passage content text */
  content: z.string(),
  /** Human-readable reference (e.g., "Matthew 1:1") */
  reference: z.string(),
});

export type BiblePassage = Readonly<z.infer<typeof BiblePassageSchema>>;
