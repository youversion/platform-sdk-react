import * as z from 'zod/mini';
import { object } from './object';

const _UserSchema = object({
  avatar_url: z.string(),
  first_name: z.string(),
  id: z.uuid(),
  last_name: z.string(),
});

export type User = z.infer<typeof _UserSchema>;
