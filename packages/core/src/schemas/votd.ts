import * as z from 'zod/mini';

export const VOTDSchema = z.object({
  /** Day of year (1-366) */
  day: z.int().check(z.gte(1), z.lte(366)),
  /** Passage identifier (e.g., "JHN.3.16") */
  passage_id: z.string(),
});

export type VOTD = Readonly<z.infer<typeof VOTDSchema>>;
