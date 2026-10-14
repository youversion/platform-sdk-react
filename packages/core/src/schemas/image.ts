import * as z from 'zod/mini';

/** A verse-art image record from the Images API. */
export const ImageSchema = z.object({
  /** Opaque identifier. Pass it to `ImagesClient.getImage` unchanged. */
  id: z.string(),
  /**
   * CDN URL for the image bytes. The SDK does not download images.
   * Set the `size` query parameter to `thumb`, `card`, or `full` for a rendition.
   *
   * Kept as `z.string()`, matching `VideoPlaybackSource.url`, so a CDN value
   * the server already sends is not rejected by a stricter URL check.
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

/** `GET /v1/images` body. `ImagesClient` maps this to `Collection<Image>`. */
export const ImageCollectionWireSchema = z.object({
  data: z.array(ImageSchema),
  next_page_token: z.optional(z.nullable(z.string())),
  total_size: z.optional(z.nullable(z.int().check(z.nonnegative()))),
});

export type ImageCollectionWire = z.infer<typeof ImageCollectionWireSchema>;

/** Caller-supplied image id. The id is opaque, so only a blank id fails. */
export const ImageIdSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Image ID must be a non-empty string'));

// Blank only. Chapter grammar belongs to the server, which answers 400.
const ImagePassageIdSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Passage ID must be a non-empty string'));

// Trimmed and non-blank. No case rewrite. The Images range grammar is the server's.
const ImageLanguageRangeSchema = z
  .string()
  .check(z.trim(), z.minLength(1, 'Language ranges must be a non-empty string'));

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
