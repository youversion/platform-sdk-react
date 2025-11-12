import { z } from 'zod';

const _UserSchema = z.object({
  avatar_url: z.string(),
  first_name: z.string(),
  id: z.uuid(),
  last_name: z.string(),
});

export type User = z.infer<typeof _UserSchema>;
