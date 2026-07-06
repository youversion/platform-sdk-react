import type { Organization } from '../types';

export const mockLockmanOrganization: Organization = {
  id: '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
  name: 'The Lockman Foundation',
  primary_language: 'en',
  website_url: 'https://www.lockman.org',
};

export const mockBiblicaOrganization: Organization = {
  id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
  name: 'Biblica',
  primary_language: 'en',
  website_url: 'https://www.biblica.com',
};

export const mockOrganizations: Organization[] = [mockLockmanOrganization, mockBiblicaOrganization];
