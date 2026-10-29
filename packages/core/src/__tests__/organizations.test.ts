import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../client';
import { OrganizationsClient } from '../organizations';
import { mockOrganizationWithoutDescription } from './MockOrganizations';

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
    it('fetches and validates an organization not requested by browser journeys', async () => {
      const organization = await organizationsClient.getOrganization(
        '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
      );
      expect(organization.id).toBe('798d8fa4-f640-4155-8cfb-fa91d1d8a06c');
      expect(organization.name).toBe('The Lockman Foundation');
    });

    it('accepts the null address the API sends for organizations without one', async () => {
      const organization = await organizationsClient.getOrganization(
        '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
      );
      expect(organization.address).toBeNull();
    });

    it('accepts a null description', async () => {
      const organization = await organizationsClient.getOrganization(
        mockOrganizationWithoutDescription.id,
      );
      expect(organization.name).toBe('MissionAssist');
      expect(organization.description).toBeNull();
    });

    it('should throw an error for invalid organization ID', async () => {
      await expect(organizationsClient.getOrganization('not-a-uuid')).rejects.toThrow(
        'Organization ID must be a valid UUID',
      );
    });
  });
});
