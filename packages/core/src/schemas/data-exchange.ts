import { z } from 'zod';

/**
 * Response of `POST /data-exchange/token`: a short-lived data-exchange token
 * minted for the requested permissions (see {@link DataExchangeClient}).
 */
export const DataExchangeTokenResponseSchema = z.object({
  token: z.string().min(1),
});

export type DataExchangeTokenResponse = z.infer<typeof DataExchangeTokenResponseSchema>;
