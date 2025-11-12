import { z } from 'zod';

export const VOTDSchema = z.object({
  /** Day of year (1-366) */
  day: z.number().int().min(1).max(366),
  /** Passage identifier (e.g., "JHN.3.16") */
  passage_id: z.string(),
});

export type VOTD = z.infer<typeof VOTDSchema>;
