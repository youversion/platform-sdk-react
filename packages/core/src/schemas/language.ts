import { z } from 'zod';

export const LanguageSchema = z.object({
  /** BCP 47 language identifier (e.g., "en") */
  id: z
    .string()
    .regex(/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/, 'BCP 47 id limited to language or language+script'),
  /** ISO 639 language code */
  language: z.string().regex(/^[a-z]{2,3}$/, 'ISO 639 canonical language subtag'),
  /** ISO 15924 script code (e.g., "Latn") */
  script: z
    .string()
    .regex(/^[A-Z][a-z]{3}$/, 'Script must match ISO 15924 format (e.g., "Latn")')
    .nullable()
    .optional(),
  /** Script name (e.g., "Latin") */
  script_name: z.string().nullable().optional(),
  /** Language aliases */
  aliases: z.array(z.string()).optional(),
  /** Display names for different locales */
  display_names: z.record(z.string(), z.string()).optional(),
  /** Available scripts for this language (e.g., ["Cyrl", "Latn"]) */
  scripts: z.array(z.string().regex(/^[A-Z][a-z]{3}$/, 'ISO 15924 script code')).optional(),
  /** Language variants (e.g., ["1996", "fonipa"]) */
  variants: z.array(z.string()).optional(),
  /** ISO 3166-1 alpha-2 country codes (e.g., ["RS", "BA", "ME"]) */
  countries: z.array(z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 country code')).optional(),
  /** Text direction (ltr or rtl) */
  text_direction: z.enum(['ltr', 'rtl']).optional(),
  /** Writing population count */
  writing_population: z.number().int().optional(),
  /** Speaking population count */
  speaking_population: z.number().int().optional(),
  /** Default Bible version ID for this language */
  default_bible_id: z.number().int().nullable().optional(),
});

export type Language = Readonly<z.infer<typeof LanguageSchema>>;
