import * as z from 'zod/mini';

/** BCP 47 tag limited to language or language+script (e.g., "en", "zh-Hans"). */
export const BCP47_LANGUAGE_TAG_REGEX = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/;

/** Input validation for a caller-supplied language identifier. */
export const LanguageIdSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Language ID must be a non-empty string'),
    z.regex(
      BCP47_LANGUAGE_TAG_REGEX,
      'Language ID must match BCP 47 format (language or language+script)',
    ),
  );

export const LanguageSchema = z.object({
  /** BCP 47 language identifier (e.g., "en") */
  id: z
    .string()
    .check(z.regex(BCP47_LANGUAGE_TAG_REGEX, 'BCP 47 id limited to language or language+script')),
  /** ISO 639 language code */
  language: z.string().check(z.regex(/^[a-z]{2,3}$/, 'ISO 639 canonical language subtag')),
  /** ISO 15924 script code (e.g., "Latn") */
  script: z.optional(
    z.nullable(
      z
        .string()
        .check(z.regex(/^[A-Z][a-z]{3}$/, 'Script must match ISO 15924 format (e.g., "Latn")')),
    ),
  ),
  /** Script name (e.g., "Latin") */
  script_name: z.optional(z.nullable(z.string())),
  /** Language aliases */
  aliases: z.optional(z.array(z.string())),
  /** Display names for different locales */
  display_names: z.optional(z.record(z.string(), z.string())),
  /** Available scripts for this language (e.g., ["Cyrl", "Latn"]) */
  scripts: z.optional(
    z.array(z.string().check(z.regex(/^[A-Z][a-z]{3}$/, 'ISO 15924 script code'))),
  ),
  /** Language variants (e.g., ["1996", "fonipa"]) */
  variants: z.optional(z.array(z.string())),
  /** ISO 3166-1 alpha-2 country codes (e.g., ["RS", "BA", "ME"]) */
  countries: z.optional(
    z.array(z.string().check(z.regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 country code'))),
  ),
  /** Text direction (ltr or rtl) */
  text_direction: z.optional(z.enum(['ltr', 'rtl'])),
  /** Writing population count */
  writing_population: z.optional(z.int()),
  /** Speaking population count */
  speaking_population: z.optional(z.int()),
  /** Default Bible version ID for this language */
  default_bible_id: z.optional(z.nullable(z.int())),
});

export type Language = Readonly<z.infer<typeof LanguageSchema>>;

const countrySchema = z
  .string()
  .check(
    z.trim(),
    z.length(2, 'Country code must be a 2-character ISO 3166-1 alpha-2 code'),
    z.toUpperCase(),
  );

export const GetLanguagesOptionsSchema = z
  .object({
    page_size: z.optional(z.union([z.int().check(z.positive()), z.literal('*')])),
    fields: z.optional(z.array(z.keyof(LanguageSchema))),
    page_token: z.optional(z.string()),
    /** ISO 3166-1 alpha-2 country code */
    country: z.optional(countrySchema),
  })
  .check(
    z.refine(
      (data) => {
        if (data?.page_size === '*') {
          return data.fields && data.fields.length >= 1 && data.fields.length <= 3;
        }
        return true;
      },
      {
        error: 'page_size="*" requires 1-3 fields to be specified',
        path: ['page_size', 'fields'],
      },
    ),
  );

export type GetLanguagesOptions = z.infer<typeof GetLanguagesOptionsSchema>;
