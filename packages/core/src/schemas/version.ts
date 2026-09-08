import * as z from 'zod/mini';
import { BookUsfmSchema } from './book';

export const BibleVersionSchema = z.object({
  /** Bible version identifier */
  id: z.int(),
  /** Bible version abbreviation */
  abbreviation: z.string(),
  /** Long copyright text */
  promotional_content: z.optional(z.nullable(z.string())),
  /** Short copyright text */
  copyright: z.optional(z.nullable(z.string())),
  /** Bible information text */
  info: z.optional(z.nullable(z.string())),
  /** Publisher URL (may be an empty string when not provided) */
  publisher_url: z.optional(z.nullable(z.string())),
  /** Language tag (e.g., "en") */
  language_tag: z.string(),
  /** Localized abbreviation */
  localized_abbreviation: z.string(),
  /** Localized title */
  localized_title: z.string(),
  /** Organization ID of publisher */
  organization_id: z.optional(z.nullable(z.string())),
  /** Full title */
  title: z.string(),
  /** Array of book identifiers (e.g., ["GEN", "EXO", "LEV"]) */
  books: z.array(BookUsfmSchema),
  /** YouVersion deep link URL */
  youversion_deep_link: z.url(),
});

export type BibleVersion = Readonly<z.infer<typeof BibleVersionSchema>>;

/** Input validation for a Bible version identifier. */
export const BibleVersionIdSchema = z
  .int()
  .check(z.positive('Version ID must be a positive integer'));

/** Input validation for one language range accepted by the versions list endpoint. */
export const LanguageRangeSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Language ranges must be a non-empty string'));

export const GetVersionsOptionsSchema = z
  .optional(
    z.object({
      page_size: z.optional(z.union([z.int().check(z.positive()), z.literal('*')])),
      page_token: z.optional(z.string()),
      fields: z.optional(z.array(z.keyof(BibleVersionSchema))),
      all_available: z.optional(z.boolean()),
    }),
  )
  .check(
    z.refine(
      (data) => {
        if (data?.page_size === '*') {
          return data.fields && data.fields.length >= 1 && data.fields.length <= 3;
        }
        return true;
      },
      {
        error: 'page_size="*" required 1-3 fields to be specified',
        path: ['page_size', 'fields'],
      },
    ),
  );

export type GetVersionsOptions = z.infer<typeof GetVersionsOptionsSchema>;
