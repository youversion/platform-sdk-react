import * as z from 'zod/mini';

export const LanguageSchema = z.object({
  /** BCP 47 language identifier (e.g., "en") */
  id: z
    .string()
    .check(
      z.regex(
        /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/,
        'BCP 47 id limited to language or language+script',
      ),
    ),
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
