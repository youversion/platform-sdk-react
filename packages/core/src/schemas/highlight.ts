import { z } from 'zod';

const _HighlightSchema = z.object({
  /** Bible version identifier */
  version_id: z.number().int().positive(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Hex color code (6 digits, no #) */
  color: z.string().regex(/^[0-9a-f]{6}$/),
});

export type Highlight = z.infer<typeof _HighlightSchema>;

const _CreateHighlightSchema = z.object({
  /** Bible version identifier */
  version_id: z.number().int().positive(),
  /** Passage identifier (e.g., "MAT.1.1") */
  passage_id: z.string(),
  /** Hex color code (6 digits, no #) */
  color: z.string().regex(/^[0-9a-f]{6}$/),
});

export type CreateHighlight = z.infer<typeof _CreateHighlightSchema>;
