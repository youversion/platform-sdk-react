import * as z from 'zod/mini';
import type { ApiClient } from './client';
import { OrganizationSchema } from './schemas';
import type { Organization } from './types';

/** Client for interacting with Organization API endpoints. */
export class OrganizationsClient {
  private client: ApiClient;

  private static readonly organizationIdSchema = z.pipe(
    z.string().check(z.trim()),
    z.uuid({ error: 'Organization ID must be a valid UUID' }),
  );

  /** Creates a new OrganizationsClient instance. */
  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Fetches an organization by its ID.
   * @param organizationId The organization UUID.
   * @returns The requested Organization object.
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    const parsedOrganizationId = OrganizationsClient.organizationIdSchema.parse(organizationId);
    const organization = await this.client.get<Organization>(
      `/v1/organizations/${parsedOrganizationId}`,
    );

    return OrganizationSchema.parse(organization);
  }
}
