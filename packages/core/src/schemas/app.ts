import * as z from 'zod/mini';
import { object } from './object';

/** A public app summary resource. */
export const AppSummarySchema = object({
  /** The unique identifier of the app. */
  app_id: z.uuid(),
  /** The app name. */
  name: z.string(),
  /** The app description. */
  description: z.optional(z.string()),
  /** The app's website URL. */
  website_url: z.optional(z.string()),
  /** The app's lifecycle status. */
  status: z.optional(z.enum(['development', 'live', 'archived'])),
});

export type AppSummary = Readonly<z.infer<typeof AppSummarySchema>>;
