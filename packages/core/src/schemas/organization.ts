import * as z from 'zod/mini';

/** A localized place name with short and long forms. */
const PlaceNameSchema = z.object({
  /** The short name of the place, e.g. "OK" for Oklahoma. */
  short_name: z.optional(z.string()),
  /** The long name of the place, e.g. "Oklahoma" for the state of Oklahoma. */
  long_name: z.optional(z.string()),
});

/** The Address Schema belonging to the Organization Resource in the Platform. */
export const OrganizationAddressSchema = z.object({
  /** The human-readable address of the organization. */
  formatted_address: z.optional(z.string()),
  /** A less specific, more broad field combining different regional fields. */
  formatted_locality: z.optional(z.string()),
  /** The textual identifier that uniquely identifies a place. */
  place_id: z.optional(z.string()),
  /** The latitude of the address profile. */
  latitude: z.optional(z.number()),
  /** The longitude of the address profile. */
  longitude: z.optional(z.number()),
  /** The administrative area (e.g. state/province). */
  administrative_area_level_1: z.optional(PlaceNameSchema),
  /** The locality (e.g. city). */
  locality: z.optional(PlaceNameSchema),
  /** The country. */
  country: z.optional(PlaceNameSchema),
});

export type OrganizationAddress = Readonly<z.infer<typeof OrganizationAddressSchema>>;

/** The Organization Resource in the Platform. */
export const OrganizationSchema = z.object({
  /** The unique identifier of the organization in the Platform. */
  id: z.uuid(),
  /** The id of the parent organization if one exists. */
  parent_organization_id: z.optional(z.nullable(z.uuid())),
  /**
   * Publisher's name in the language negotiated by Accept-Language headers. If
   * none match known translations, the primary language of the publisher is
   * used. The chosen language is returned in the Content-Language header.
   */
  name: z.optional(z.string()),
  /** Description of the organization: its purpose, goals, values, and mission. */
  description: z.optional(z.string()),
  /** The contact email address for the organization if provided. */
  email: z.optional(z.nullable(z.string())),
  /** The contact phone number for the organization if provided. */
  phone: z.optional(z.nullable(z.string())),
  /** The primary language of the organization. */
  primary_language: z.optional(z.string()),
  /** The web site for the organization. */
  website_url: z.optional(z.string()),
  /** The organization's address. */
  address: z.optional(OrganizationAddressSchema),
});

export type Organization = Readonly<z.infer<typeof OrganizationSchema>>;
