import * as z from 'zod/mini';

/** Body of `POST /data-exchange/token`. */
export const DataExchangeTokenRequestSchema = z.object({
  requested_permissions: z.array(z.string()),
});
export type DataExchangeTokenRequest = z.infer<typeof DataExchangeTokenRequestSchema>;

/**
 * Response of `POST /data-exchange/token`: a short-lived data-exchange token
 * minted for the requested permissions (see {@link DataExchangeClient}).
 */
export const DataExchangeTokenResponseSchema = z.object({
  token: z.string().check(z.minLength(1)),
});

export type DataExchangeTokenResponse = z.infer<typeof DataExchangeTokenResponseSchema>;
