import * as z from 'zod/mini';

/**
 * Shape of the decoded user profile that is persisted at sign-in.
 *
 * The ID token is decoded once to produce this profile and then discarded — the
 * token itself is never persisted. This schema validates the profile when it is
 * rehydrated from storage so a tampered or malformed entry is rejected rather
 * than trusted blindly.
 */
export const YouVersionUserInfoJSONSchema = z.object({
  name: z.optional(z.string()),
  id: z.optional(z.string()),
  avatar_url: z.optional(z.string()),
  email: z.optional(z.string()),
});

export type YouVersionUserInfoJSON = z.infer<typeof YouVersionUserInfoJSONSchema>;
