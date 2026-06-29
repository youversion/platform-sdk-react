import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '../client';
import { OrganizationsClient } from '../organizations';
import { OrganizationSchema } from '../schemas';

describe('OrganizationsClient', () => {
  let apiClient: ApiClient;
  let organizationsClient: OrganizationsClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      apiHost: process.env.YVP_API_HOST || '',
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'test-installation',
    });
    organizationsClient = new OrganizationsClient(apiClient);
  });

  describe('getOrganization', () => {
    it('should fetch an organization by ID', async () => {
      const organization = await organizationsClient.getOrganization(
        '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
      );

      const { success } = OrganizationSchema.safeParse(organization);
      expect(success).toBe(true);
      expect(organization.id).toBe('798d8fa4-f640-4155-8cfb-fa91d1d8a06c');
      expect(organization.name).toBe('The Lockman Foundation');
    });

    it('should request the organization endpoint with the provided ID', async () => {
      const getSpy = vi.spyOn(apiClient, 'get');

      await organizationsClient.getOrganization('05a9aa40-37b6-4e34-b9f1-a443fa4b1fff');

      expect(getSpy).toHaveBeenCalledWith('/v1/organizations/05a9aa40-37b6-4e34-b9f1-a443fa4b1fff');
      getSpy.mockRestore();
    });

    it('should throw an error for invalid organization ID', async () => {
      await expect(organizationsClient.getOrganization('not-a-uuid')).rejects.toThrow(
        'Organization ID must be a valid UUID',
      );
    });
  });
});
