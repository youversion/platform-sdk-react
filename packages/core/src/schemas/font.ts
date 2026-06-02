import { z } from 'zod';

/** A CDN asset for a specific font weight and style. */
export const FontSourceSchema = z.object({
  /** The file format for this source asset. */
  format: z.enum(['woff2', 'ttf']),
  /** Fully qualified CDN URL for this font source file. */
  url: z.url(),
});

export type FontSource = Readonly<z.infer<typeof FontSourceSchema>>;

/** An available face within a font family. */
export const FontVariantSchema = z.object({
  /** Numeric font weight for this variant. */
  weight: z.union([z.literal(400), z.literal(500), z.literal(700)]),
  /** Font style for this variant. */
  style: z.enum(['normal', 'italic']),
  /** CDN assets available for this specific weight and style. */
  sources: z.array(FontSourceSchema),
});

export type FontVariant = Readonly<z.infer<typeof FontVariantSchema>>;

/** A font family resource with available variants and CDN-backed source files. */
export const FontSchema = z.object({
  /** Stable integer identifier for the font family. */
  id: z.number().int(),
  /** Stable URL-safe identifier for the font family. */
  slug: z.string(),
  /** Canonical font-family name clients should use. */
  family: z.string(),
  /** Available faces within this font family. */
  variants: z.array(FontVariantSchema),
});

export type Font = Readonly<z.infer<typeof FontSchema>>;
