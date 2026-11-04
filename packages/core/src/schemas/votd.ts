import * as z from 'zod/mini';
import type { Collection } from './collection';
import { parseLanguageRanges } from './language-range';

const VOTDDaySchema = z.int().check(z.gte(1), z.lte(366));

export const VOTDSchema = z.object({
  /** Day of year (1-366) */
  day: VOTDDaySchema,
  /** Passage identifier (e.g., "JHN.3.16") */
  passage_id: z.string(),
  /**
   * Curated image id for this day. Callers may omit it.
   * Parsed responses use `null` when the API omits it or sends null.
   */
  image_id: z.optional(z.nullable(z.string())),
});

export type VOTD = Readonly<z.input<typeof VOTDSchema>>;

export const VOTDRecordWireSchema = z.pipe(
  VOTDSchema,
  z.transform((wire) => ({
    day: wire.day,
    passage_id: wire.passage_id,
    image_id: wire.image_id ?? null,
  })),
);

export type VOTDResponse = Readonly<z.output<typeof VOTDRecordWireSchema>>;

export const VOTDCollectionWireSchema = z.pipe(
  z.object({
    data: z.array(VOTDRecordWireSchema),
    next_page_token: z.optional(z.nullable(z.string())),
    total_size: z.optional(z.nullable(z.int().check(z.nonnegative()))),
  }),
  z.transform((wire): Collection<VOTDResponse> => {
    const page: Collection<VOTDResponse> = {
      data: wire.data,
      next_page_token: wire.next_page_token ?? null,
    };
    if (wire.total_size == null) {
      return page;
    }
    return { ...page, total_size: wire.total_size };
  }),
);

const GetVOTDOptionsSchema = z.object({
  language_ranges: z.optional(
    z.readonly(
      z.array(z.string()).check(z.minLength(1, 'At least one language range is required')),
    ),
  ),
});

export type GetVOTDOptions = Readonly<z.infer<typeof GetVOTDOptionsSchema>>;

export function parseVOTDDay(day: number): number {
  return VOTDDaySchema.parse(day);
}

export function parseVOTDLanguageQuery(
  options?: GetVOTDOptions,
): { 'language_ranges[]': string[] } | undefined {
  const parsed = GetVOTDOptionsSchema.parse(options ?? {});
  if (parsed.language_ranges === undefined) {
    return undefined;
  }
  return { 'language_ranges[]': parseLanguageRanges(parsed.language_ranges) };
}
