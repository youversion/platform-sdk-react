import type { Organization } from '../types';

// Shapes mirror live GET /v1/organizations/{id} responses, which send null for absent
// optional fields rather than omitting them.
export const mockLockmanOrganization: Organization = {
  id: '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
  parent_organization_id: null,
  name: 'The Lockman Foundation',
  description: 'Publisher of the New American Standard Bible and the Amplified Bible.',
  phone: null,
  primary_language: 'en',
  website_url: 'https://www.lockman.org',
  address: null,
};

export const mockBiblicaOrganization: Organization = {
  id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
  parent_organization_id: null,
  name: 'Biblica',
  description: 'Publisher and translation sponsor of the New International Version.',
  phone: null,
  primary_language: 'en',
  website_url: 'https://www.biblica.com',
  address: null,
};

/** Some live organizations also send `description: null`. */
export const mockOrganizationWithoutDescription: Organization = {
  id: '3c6f0a8e-5b2d-4f1e-9a7c-2d8b4e6f1a3c',
  parent_organization_id: null,
  name: 'MissionAssist',
  description: null,
  email: null,
  phone: null,
  primary_language: 'en',
  website_url: 'https://www.missionassist.org.uk',
  address: null,
};

export const mockOrganizations: Organization[] = [
  mockLockmanOrganization,
  mockBiblicaOrganization,
  mockOrganizationWithoutDescription,
];
