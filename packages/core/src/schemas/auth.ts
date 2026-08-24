import { z } from 'zod';

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
  sub: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
  profile_picture: z.string().optional().catch(undefined),
  email: z.string().optional().catch(undefined),
});
export type IdTokenClaims = z.infer<typeof IdTokenClaimsSchema>;

export const TokenExchangeResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  id_token: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});
export type TokenExchangeResponse = z.infer<typeof TokenExchangeResponseSchema>;

export const TokenRefreshResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
});
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;
