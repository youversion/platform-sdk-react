import * as z from 'zod/mini';
import { BiblePassageSchema, type BiblePassage } from './passage';
import { BibleVersionIdSchema, BibleVersionSchema, type BibleVersion } from './version';

export const GetPassageDisplayOptionsSchema = z.object({
  versionId: BibleVersionIdSchema,
  passageId: z.string().check(z.trim(), z.minLength(1, 'Passage ID must be a non-empty string')),
  includeHeadings: z.optional(z.boolean()),
  includeNotes: z.optional(z.boolean()),
});

export const PassageAttributionSchema = z.object({
  text: z.string().check(z.minLength(1)),
  source: z.enum(['copyright', 'promotionalContent']),
});

export const PassageStylesheetSchema = z.object({
  kind: z.enum(['bible', 'font']),
  rel: z.literal('stylesheet'),
  href: z.url(),
});

const BiblePassageContainerAttributesSchema = z.object({
  'data-yv-sdk': z.literal(''),
  'data-slot': z.literal('yv-bible-renderer'),
});

export const BiblePassageDisplaySchema = z.object({
  passage: BiblePassageSchema,
  version: BibleVersionSchema,
  html: z.string(),
  attribution: PassageAttributionSchema,
  stylesheets: z.array(PassageStylesheetSchema),
  containerAttributes: BiblePassageContainerAttributesSchema,
});

export type GetPassageDisplayOptions = Readonly<z.infer<typeof GetPassageDisplayOptionsSchema>>;
export type PassageAttribution = Readonly<z.infer<typeof PassageAttributionSchema>>;
export type PassageStylesheet = Readonly<z.infer<typeof PassageStylesheetSchema>>;
export type BiblePassageDisplay = Readonly<
  Omit<
    z.infer<typeof BiblePassageDisplaySchema>,
    'passage' | 'version' | 'attribution' | 'stylesheets' | 'containerAttributes'
  > & {
    passage: BiblePassage;
    version: BibleVersion;
    attribution: PassageAttribution;
    stylesheets: readonly PassageStylesheet[];
    containerAttributes: Readonly<z.infer<typeof BiblePassageContainerAttributesSchema>>;
  }
>;
