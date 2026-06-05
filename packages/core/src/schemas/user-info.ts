import { z } from 'zod';

/**
 * Shape of the decoded user profile that is persisted at sign-in.
 *
 * The ID token is decoded once to produce this profile and then discarded — the
 * token itself is never persisted. This schema validates the profile when it is
 * rehydrated from storage so a tampered or malformed entry is rejected rather
 * than trusted blindly.
 */
export const YouVersionUserInfoJSONSchema = z.object({
  name: z.string().optional(),
  id: z.string().optional(),
  avatar_url: z.string().optional(),
  email: z.string().optional(),
});

export type YouVersionUserInfoJSON = z.infer<typeof YouVersionUserInfoJSONSchema>;
