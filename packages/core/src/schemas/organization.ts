import { z } from 'zod';

/** A localized place name with short and long forms. */
const PlaceNameSchema = z.object({
  /** The short name of the place, e.g. "OK" for Oklahoma. */
  short_name: z.string().optional(),
  /** The long name of the place, e.g. "Oklahoma" for the state of Oklahoma. */
  long_name: z.string().optional(),
});

/** The Address Schema belonging to the Organization Resource in the Platform. */
export const OrganizationAddressSchema = z.object({
  /** The human-readable address of the organization. */
  formatted_address: z.string().optional(),
  /** A less specific, more broad field combining different regional fields. */
  formatted_locality: z.string().optional(),
  /** The textual identifier that uniquely identifies a place. */
  place_id: z.string().optional(),
  /** The latitude of the address profile. */
  latitude: z.number().optional(),
  /** The longitude of the address profile. */
  longitude: z.number().optional(),
  /** The administrative area (e.g. state/province). */
  administrative_area_level_1: PlaceNameSchema.optional(),
  /** The locality (e.g. city). */
  locality: PlaceNameSchema.optional(),
  /** The country. */
  country: PlaceNameSchema.optional(),
});

export type OrganizationAddress = Readonly<z.infer<typeof OrganizationAddressSchema>>;

/** The Organization Resource in the Platform. */
export const OrganizationSchema = z.object({
  /** The unique identifier of the organization in the Platform. */
  id: z.uuid(),
  /** The id of the parent organization if one exists. */
  parent_organization_id: z.uuid().nullable().optional(),
  /**
   * Publisher's name in the language negotiated by Accept-Language headers. If
   * none match known translations, the primary language of the publisher is
   * used. The chosen language is returned in the Content-Language header.
   */
  name: z.string().optional(),
  /** Description of the organization: its purpose, goals, values, and mission. */
  description: z.string().optional(),
  /** The contact email address for the organization if provided. */
  email: z.string().nullable().optional(),
  /** The contact phone number for the organization if provided. */
  phone: z.string().nullable().optional(),
  /** The primary language of the organization. */
  primary_language: z.string().optional(),
  /** The web site for the organization. */
  website_url: z.string().optional(),
  /** The organization's address. */
  address: OrganizationAddressSchema.optional(),
});

export type Organization = Readonly<z.infer<typeof OrganizationSchema>>;
