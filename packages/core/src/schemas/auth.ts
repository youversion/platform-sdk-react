import * as z from 'zod/mini';

/** OAuth `state`-bound permission list persisted across the redirect handoff. */
export const StatePermissionsStashSchema = z.object({
  state: z.string(),
  permissions: z.array(z.string()),
});
export type StatePermissionsStash = z.infer<typeof StatePermissionsStashSchema>;

/** Optimistic data-exchange grants cached in storage, scoped to a user. */
export const StoredGrantsSchema = z.object({
  userId: z.string(),
  permissions: z.array(z.string()),
});
export type StoredGrants = z.infer<typeof StoredGrantsSchema>;

/** Claims read from an ID token for UI display. Signature is not verified here. */
export const IdTokenClaimsSchema = z.object({
  sub: z.catch(z.optional(z.string()), undefined),
  name: z.catch(z.optional(z.string()), undefined),
  profile_picture: z.catch(z.optional(z.string()), undefined),
  email: z.catch(z.optional(z.string()), undefined),
});
export type IdTokenClaims = z.infer<typeof IdTokenClaimsSchema>;

/** Seconds until expiry. Live `/auth/token` sends a digit string; mocks may send a number. */
const TokenExpiresInSchema = z.pipe(
  z.union([z.number(), z.pipe(z.string().check(z.regex(/^\d+$/)), z.transform(Number))]),
  z.int().check(z.positive()),
);

export const TokenExchangeResponseSchema = z.object({
  access_token: z.string(),
  expires_in: TokenExpiresInSchema,
  id_token: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});
export type TokenExchangeResponse = z.infer<typeof TokenExchangeResponseSchema>;

export const TokenRefreshResponseSchema = z.object({
  access_token: z.string(),
  expires_in: TokenExpiresInSchema,
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;
