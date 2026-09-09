import type { ApiClient } from './client';
import { parsePublic } from './parse-public';
import { OrganizationIdSchema, OrganizationSchema } from './schemas/organization';
import type { Organization } from './types';

/** Client for interacting with Organization API endpoints. */
export class OrganizationsClient {
  private client: ApiClient;

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
    const parsedOrganizationId = parsePublic(OrganizationIdSchema, organizationId);
    const organization = await this.client.get<Organization>(
      `/v1/organizations/${parsedOrganizationId}`,
    );

    return parsePublic(OrganizationSchema, organization);
  }
}
