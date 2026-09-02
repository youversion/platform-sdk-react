import * as z from 'zod/mini';

/** A license under which Bible content is offered in the Platform. */
export const LicenseSchema = z.object({
  /** The license identifier. */
  id: z.optional(z.int()),
  /** The license name. */
  name: z.optional(z.string()),
  /** The license version. */
  version: z.optional(z.int()),
  /** The YouVersion Organization ID that owns this license. */
  organization_id: z.optional(z.uuid()),
  /** HTML representation of the license terms. */
  html: z.optional(z.string()),
  /** Bible version ids offered under this license. */
  bible_ids: z.optional(z.array(z.int())),
  /** URI pointing to the license terms. */
  uri: z.optional(z.nullable(z.string())),
  /**
   * The date the passed developer id agreed to this license, or null if not
   * agreed to.
   */
  agreed_dt: z.optional(z.nullable(z.string())),
  /**
   * The YouVersion Platform User id that was logged into the dev portal and
   * agreed to the license.
   */
  yvp_user_id: z.optional(z.nullable(z.uuid())),
});

export type License = Readonly<z.infer<typeof LicenseSchema>>;
