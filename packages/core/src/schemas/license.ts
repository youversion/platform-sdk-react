import { z } from 'zod';

/** A license under which Bible content is offered in the Platform. */
export const LicenseSchema = z.object({
  /** The license identifier. */
  id: z.number().int().optional(),
  /** The license name. */
  name: z.string().optional(),
  /** The license version. */
  version: z.number().int().optional(),
  /** The YouVersion Organization ID that owns this license. */
  organization_id: z.uuid().optional(),
  /** HTML representation of the license terms. */
  html: z.string().optional(),
  /** Bible version ids offered under this license. */
  bible_ids: z.array(z.number().int()).optional(),
  /** URI pointing to the license terms. */
  uri: z.string().nullable().optional(),
  /**
   * The date the passed developer id agreed to this license, or null if not
   * agreed to.
   */
  agreed_dt: z.string().nullable().optional(),
  /**
   * The YouVersion Platform User id that was logged into the dev portal and
   * agreed to the license.
   */
  yvp_user_id: z.uuid().nullable().optional(),
});

export type License = Readonly<z.infer<typeof LicenseSchema>>;
