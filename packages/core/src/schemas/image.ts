import * as z from 'zod/mini';

/** A verse-art image record from the Images API. */
export const ImageSchema = z.object({
  /** Opaque identifier. Pass it to `ImagesClient.getImage` unchanged. */
  id: z.string(),
  /**
   * CDN URL for the image bytes. The SDK does not download images.
   * Set the `size` query parameter to `thumb`, `card`, or `full` for a rendition.
   */
  image_url: z.string(),
  /** USFM passage the image depicts, for example `JHN.3.16`. */
  passage_id: z.string(),
  /** Attribution to display with the image. The API may send an empty string. */
  attribution: z.string(),
  /** BCP 47 language tag of the text in the image, for example `en`. */
  language_tag: z.string(),
  /** Pixel width of the full-size image. */
  width: z.int(),
  /** Pixel height of the full-size image. */
  height: z.int(),
  /** Width divided by height, as reported by the API. */
  aspect_ratio: z.number(),
});

export type Image = Readonly<z.infer<typeof ImageSchema>>;

/** Wire list cursor. Empty string and null both mean no further page. */
const ImageNextPageTokenWireSchema = z.pipe(
  z.optional(z.nullable(z.string())),
  z.transform((token): string | null => (token == null || token === '' ? null : token)),
);

export const ImageCollectionWireSchema = z.object({
  data: z.array(ImageSchema),
  next_page_token: ImageNextPageTokenWireSchema,
  total_size: z.optional(z.nullable(z.int().check(z.nonnegative()))),
});

export type ImageCollectionWire = z.infer<typeof ImageCollectionWireSchema>;

export const ImageIdSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Image ID must be a non-empty string'));

const ImagePassageIdSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Passage ID must be a non-empty string'));

/** OpenAPI Basic Language Range for Images `language_ranges[]`. Case and `_` are kept. */
const IMAGE_LANGUAGE_RANGE_REGEX = /^(\*|[A-Za-z0-9]{1,8}([-_][A-Za-z0-9]{1,8})*)$/;

const IMAGE_LANGUAGE_RANGE_ERROR =
  'Language range must be "*" or a Basic Language Range (e.g., "en", "en-US", "en_US")';

const ImageLanguageRangeSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Language ranges must be a non-empty string'),
    z.regex(IMAGE_LANGUAGE_RANGE_REGEX, IMAGE_LANGUAGE_RANGE_ERROR),
  );

const PAGE_SIZE_ERROR = 'Page size must be an integer from 1 to 99';

export const GetImagesOptionsSchema = z.object({
  /**
   * Passage filter. Trimmed, and a blank value is rejected.
   * A bare chapter is sent as written. The server returns 400 for it.
   * The API reports `total_size` only when this is set.
   */
  passage_id: z.optional(ImagePassageIdSchema),
  /** Ordered language ranges, sent as `language_ranges[]`. Omit to include every language. */
  language_ranges: z.optional(
    z.readonly(
      z
        .array(ImageLanguageRangeSchema)
        .check(z.minLength(1, 'Pass at least one language range, or omit language_ranges')),
    ),
  ),
  /** Results per page, from 1 to 99. The API default is 25 when this is omitted. */
  page_size: z.optional(
    z.int({ error: PAGE_SIZE_ERROR }).check(z.gte(1, PAGE_SIZE_ERROR), z.lte(99, PAGE_SIZE_ERROR)),
  ),
  /** Cursor from the previous page. `null` and omission both request the first page. */
  page_token: z.optional(
    z.nullable(z.string().check(z.minLength(1, 'Page token must be a non-empty string'))),
  ),
});

export type GetImagesOptions = z.infer<typeof GetImagesOptionsSchema>;
