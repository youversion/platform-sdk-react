/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock globals before importing the module
const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
const mockRandomUUID = vi.fn(() => mockUUID);

// Create a working localStorage mock
const mockStorage: Record<string, string> = {};
const mockGetItem = vi.fn((key: string) => mockStorage[key] || null);
const mockSetItem = vi.fn((key: string, value: string) => {
  mockStorage[key] = value;
});
const mockRemoveItem = vi.fn((key: string) => {
  delete mockStorage[key];
});

vi.stubGlobal('crypto', { randomUUID: mockRandomUUID });
vi.stubGlobal('localStorage', {
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem,
});

import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';

const envApiHost = process.env.YVP_API_HOST || 'api.youversion.com';
if (!envApiHost) {
  throw new Error(
    'YVP_API_HOST environment variable must be set for YouVersionPlatformConfiguration tests.',
  );
}

describe('YouVersionPlatformConfiguration', () => {
  beforeEach(() => {
    // Clear call history but keep implementation
    mockRandomUUID.mockClear();
    mockGetItem.mockClear();
    mockSetItem.mockClear();
    mockRemoveItem.mockClear();

    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

    // Reset all static properties
    YouVersionPlatformConfiguration.appKey = null;
    YouVersionPlatformConfiguration.installationId = null;
    YouVersionPlatformConfiguration.saveAuthData(null, null, null, null);
    YouVersionPlatformConfiguration.apiHost = envApiHost;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('appKey', () => {
    it('should get and set appKey', () => {
      expect(YouVersionPlatformConfiguration.appKey).toBeNull();

      YouVersionPlatformConfiguration.appKey = 'test-app-key';
      expect(YouVersionPlatformConfiguration.appKey).toBe('test-app-key');

      YouVersionPlatformConfiguration.appKey = null;
      expect(YouVersionPlatformConfiguration.appKey).toBeNull();
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
      mockStorage['x-yvp-installation-id'] = existingUUID;

      // Clear the call history after setting up localStorage but before the test
      mockRandomUUID.mockClear();

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

  describe('saveAuthData', () => {
    it('should save and retrieve access token', () => {
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();

      const token = 'test-access-token';
      YouVersionPlatformConfiguration.saveAuthData(token, null, null, null);
      expect(YouVersionPlatformConfiguration.accessToken).toBe(token);

      YouVersionPlatformConfiguration.saveAuthData(null, null, null, null);
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();
    });

    it('should save and retrieve refresh token', () => {
      expect(YouVersionPlatformConfiguration.refreshToken).toBeNull();

      const refreshToken = 'test-refresh-token';
      YouVersionPlatformConfiguration.saveAuthData(null, refreshToken, null, null);
      expect(YouVersionPlatformConfiguration.refreshToken).toBe(refreshToken);

      YouVersionPlatformConfiguration.saveAuthData(null, null, null, null);
      expect(YouVersionPlatformConfiguration.refreshToken).toBeNull();
    });

    it('should save and retrieve expiry date', () => {
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toBeNull();

      const expiryDate = new Date('2024-12-31T23:59:59Z');
      YouVersionPlatformConfiguration.saveAuthData(null, null, null, expiryDate);
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toEqual(expiryDate);

      YouVersionPlatformConfiguration.saveAuthData(null, null, null, null);
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toBeNull();
    });

    it('should save all auth data together', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';
      const idToken = 'test-id-token';
      const expiryDate = new Date('2024-12-31T23:59:59Z');

      YouVersionPlatformConfiguration.saveAuthData(accessToken, refreshToken, idToken, expiryDate);

      expect(YouVersionPlatformConfiguration.accessToken).toBe(accessToken);
      expect(YouVersionPlatformConfiguration.refreshToken).toBe(refreshToken);
      expect(YouVersionPlatformConfiguration.idToken).toBe(idToken);
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toEqual(expiryDate);
    });

    it('should handle partial updates without affecting other tokens', () => {
      // Set up initial state
      const initialAccess = 'initial-access';
      const initialRefresh = 'initial-refresh';
      const initialIdToken = 'initial-id-token';
      const initialExpiry = new Date('2024-01-01T00:00:00Z');
      YouVersionPlatformConfiguration.saveAuthData(
        initialAccess,
        initialRefresh,
        initialIdToken,
        initialExpiry,
      );

      // Update only access token
      const newAccess = 'new-access-token';
      YouVersionPlatformConfiguration.saveAuthData(newAccess, null, null, null);

      expect(YouVersionPlatformConfiguration.accessToken).toBe(newAccess);
      expect(YouVersionPlatformConfiguration.refreshToken).toBeNull();
      expect(YouVersionPlatformConfiguration.idToken).toBeNull();
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toBeNull();
    });

    it('should properly serialize and deserialize dates', () => {
      const originalDate = new Date('2024-06-15T14:30:45.123Z');
      YouVersionPlatformConfiguration.saveAuthData(null, null, null, originalDate);

      const retrievedDate = YouVersionPlatformConfiguration.tokenExpiryDate;
      expect(retrievedDate).toEqual(originalDate);
      expect(retrievedDate?.getTime()).toBe(originalDate.getTime());
    });

    it('should call localStorage methods correctly', () => {
      const accessToken = 'test-access';
      const refreshToken = 'test-refresh';
      const idToken = 'test-id';
      const expiryDate = new Date('2024-12-31T23:59:59Z');

      YouVersionPlatformConfiguration.saveAuthData(accessToken, refreshToken, idToken, expiryDate);

      expect(mockSetItem).toHaveBeenCalledWith('accessToken', accessToken);
      expect(mockSetItem).toHaveBeenCalledWith('refreshToken', refreshToken);
      expect(mockSetItem).toHaveBeenCalledWith('idToken', idToken);
      expect(mockSetItem).toHaveBeenCalledWith('expiryDate', expiryDate.toISOString());
    });

    it('should call removeItem when tokens are null', () => {
      // First set some values
      YouVersionPlatformConfiguration.saveAuthData('access', 'refresh', 'id-token', new Date());

      // Clear the mock calls
      mockRemoveItem.mockClear();

      // Now set to null
      YouVersionPlatformConfiguration.saveAuthData(null, null, null, null);

      expect(mockRemoveItem).toHaveBeenCalledWith('accessToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('refreshToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('idToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('expiryDate');
    });
  });

  describe('clearAuthTokens', () => {
    it('should clear all auth tokens', () => {
      // Set up initial auth data
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';
      const idToken = 'test-id-token';
      const expiryDate = new Date('2024-12-31T23:59:59Z');
      YouVersionPlatformConfiguration.saveAuthData(accessToken, refreshToken, idToken, expiryDate);

      // Verify data is set
      expect(YouVersionPlatformConfiguration.accessToken).toBe(accessToken);
      expect(YouVersionPlatformConfiguration.refreshToken).toBe(refreshToken);
      expect(YouVersionPlatformConfiguration.idToken).toBe(idToken);
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toEqual(expiryDate);

      // Clear all tokens
      YouVersionPlatformConfiguration.clearAuthTokens();

      // Verify all tokens are null
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();
      expect(YouVersionPlatformConfiguration.refreshToken).toBeNull();
      expect(YouVersionPlatformConfiguration.idToken).toBeNull();
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toBeNull();
    });

    it('should call removeItem for all token types', () => {
      // Set up some auth data first
      YouVersionPlatformConfiguration.saveAuthData('access', 'refresh', 'id-token', new Date());

      // Clear mock calls
      mockRemoveItem.mockClear();

      // Clear auth tokens
      YouVersionPlatformConfiguration.clearAuthTokens();

      // Verify removeItem was called for each token type
      expect(mockRemoveItem).toHaveBeenCalledWith('accessToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('refreshToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('idToken');
      expect(mockRemoveItem).toHaveBeenCalledWith('expiryDate');
    });

    it('should work when no tokens are previously set', () => {
      // Ensure clean state
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();
      expect(YouVersionPlatformConfiguration.refreshToken).toBeNull();
      expect(YouVersionPlatformConfiguration.idToken).toBeNull();
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toBeNull();

      // Should not throw when clearing empty state
      expect(() => {
        YouVersionPlatformConfiguration.clearAuthTokens();
      }).not.toThrow();

      // State should remain null
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();
      expect(YouVersionPlatformConfiguration.refreshToken).toBeNull();
      expect(YouVersionPlatformConfiguration.idToken).toBeNull();
      expect(YouVersionPlatformConfiguration.tokenExpiryDate).toBeNull();
    });
  });

  describe('apiHost', () => {
    it('should get and set apiHost', () => {
      const apiHost = process.env.YVP_API_HOST || 'api.youversion.com';
      expect(YouVersionPlatformConfiguration.apiHost).toBe(apiHost);
      YouVersionPlatformConfiguration.apiHost = 'somethingelse.youversion.com';
      expect(YouVersionPlatformConfiguration.apiHost).toBe('somethingelse.youversion.com');
      YouVersionPlatformConfiguration.apiHost = apiHost;
      expect(YouVersionPlatformConfiguration.apiHost).toBe(apiHost);
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
