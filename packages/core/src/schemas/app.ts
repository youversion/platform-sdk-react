import { z } from 'zod';

/** A public app summary resource. */
export const AppSummarySchema = z.object({
  /** The unique identifier of the app. */
  app_id: z.uuid(),
  /** The app name. */
  name: z.string(),
  /** The app description. */
  description: z.string().optional(),
  /** The app's website URL. */
  website_url: z.string().optional(),
  /** The app's lifecycle status. */
  status: z.enum(['development', 'live', 'archived']).optional(),
});

export type AppSummary = Readonly<z.infer<typeof AppSummarySchema>>;
