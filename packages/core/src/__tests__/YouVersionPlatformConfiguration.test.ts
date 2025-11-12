/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock globals before importing the module
const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
const mockRandomUUID = vi.fn(() => mockUUID);
const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.stubGlobal('crypto', { randomUUID: mockRandomUUID });
vi.stubGlobal('localStorage', { getItem: mockGetItem, setItem: mockSetItem });

import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';

describe('YouVersionPlatformConfiguration', () => {
  beforeEach(() => {
    // Reset all static properties
    YouVersionPlatformConfiguration.appId = null;
    YouVersionPlatformConfiguration.installationId = null;
    YouVersionPlatformConfiguration.setAccessToken(null);
    YouVersionPlatformConfiguration.apiHost = 'api-dev.youversion.com';
    YouVersionPlatformConfiguration.isPreviewMode = false;
    YouVersionPlatformConfiguration.previewUserInfo = null;

    // Clear call history but keep implementation
    mockRandomUUID.mockClear();
    mockGetItem.mockClear();
    mockSetItem.mockClear();

    // Setup localStorage to return null by default (empty)
    mockGetItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('appId', () => {
    it('should get and set appId', () => {
      expect(YouVersionPlatformConfiguration.appId).toBeNull();

      YouVersionPlatformConfiguration.appId = 'test-app-id';
      expect(YouVersionPlatformConfiguration.appId).toBe('test-app-id');

      YouVersionPlatformConfiguration.appId = null;
      expect(YouVersionPlatformConfiguration.appId).toBeNull();
    });
  });

  describe('installationId', () => {
    it('should get and set installationId when provided', () => {
      const testId = 'test-installation-id';
      YouVersionPlatformConfiguration.installationId = testId;

      expect(YouVersionPlatformConfiguration.installationId).toBe(testId);
    });

    it('should generate and store UUID when installationId is null', () => {
      YouVersionPlatformConfiguration.installationId = null;

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(YouVersionPlatformConfiguration.installationId).toBe(mockUUID);
    });

    it('should generate and store UUID when installationId is empty string', () => {
      YouVersionPlatformConfiguration.installationId = '';

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(YouVersionPlatformConfiguration.installationId).toBe(mockUUID);
    });

    it('should use existing UUID from localStorage when installationId is null', () => {
      const existingUUID = 'existing-uuid-from-storage';
      mockGetItem.mockReturnValue(existingUUID);

      YouVersionPlatformConfiguration.installationId = null;

      expect(mockRandomUUID).not.toHaveBeenCalled();
      expect(YouVersionPlatformConfiguration.installationId).toBe(existingUUID);
    });

    it('should generate new UUID when localStorage is empty', () => {
      YouVersionPlatformConfiguration.installationId = null;

      expect(mockRandomUUID).toHaveBeenCalled();
      expect(YouVersionPlatformConfiguration.installationId).toBe(mockUUID);
    });
  });

  describe('accessToken', () => {
    it('should set and get access token', () => {
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();

      const token = 'test-access-token';
      YouVersionPlatformConfiguration.setAccessToken(token);
      expect(YouVersionPlatformConfiguration.accessToken).toBe(token);

      YouVersionPlatformConfiguration.setAccessToken(null);
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();
    });
  });

  describe('apiHost', () => {
    it('should get and set apiHost', () => {
      expect(YouVersionPlatformConfiguration.apiHost).toBe('api-dev.youversion.com');

      YouVersionPlatformConfiguration.apiHost = 'api.youversion.com';
      expect(YouVersionPlatformConfiguration.apiHost).toBe('api.youversion.com');
    });
  });

  describe('isPreviewMode', () => {
    it('should get and set preview mode', () => {
      expect(YouVersionPlatformConfiguration.isPreviewMode).toBe(false);

      YouVersionPlatformConfiguration.isPreviewMode = true;
      expect(YouVersionPlatformConfiguration.isPreviewMode).toBe(true);

      YouVersionPlatformConfiguration.isPreviewMode = false;
      expect(YouVersionPlatformConfiguration.isPreviewMode).toBe(false);
    });
  });

  describe('UUID generation edge cases', () => {
    it('should generate valid UUID format', () => {
      YouVersionPlatformConfiguration.installationId = null;

      const generatedId = YouVersionPlatformConfiguration.installationId;
      expect(generatedId).toBe(mockUUID);
      expect(generatedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('multiple calls consistency', () => {
    it('should return same UUID on multiple null assignments', () => {
      YouVersionPlatformConfiguration.installationId = null;
      const firstId = YouVersionPlatformConfiguration.installationId;

      YouVersionPlatformConfiguration.installationId = null;
      const secondId = YouVersionPlatformConfiguration.installationId;

      expect(firstId).toBe(secondId);
      expect(firstId).toBe(mockUUID);
    });
  });
});
