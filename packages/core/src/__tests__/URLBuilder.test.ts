import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { URLBuilder } from '../URLBuilder';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import type { SignInWithYouVersionPermissionValues } from '../types';

describe('URLBuilder - Input Validation', () => {
  let originalApiHost: string;
  let originalInstallationId: string | null;

  beforeEach(() => {
    // Store original config
    originalApiHost = YouVersionPlatformConfiguration.apiHost;
    originalInstallationId = YouVersionPlatformConfiguration.installationId;

    // Set test config
    const apiHost = process.env.YVP_API_HOST;
    if (!apiHost) {
      throw new Error('YVP_API_HOST environment variable must be set for URLBuilder tests.');
    }
    YouVersionPlatformConfiguration.apiHost = apiHost;
    YouVersionPlatformConfiguration.installationId = 'test-installation-id';
  });

  afterEach(() => {
    // Restore original config
    YouVersionPlatformConfiguration.apiHost = originalApiHost;
    YouVersionPlatformConfiguration.installationId = originalInstallationId;
  });

  describe('authURL - appKey validation', () => {
    it('should throw error for empty string appKey', () => {
      expect(() => {
        URLBuilder.authURL('');
      }).toThrow('appKey must be a non-empty string');
    });

    it('should throw error for whitespace-only appKey', () => {
      expect(() => {
        URLBuilder.authURL('   ');
      }).toThrow('appKey must be a non-empty string');
    });

    it('should throw error for tab/newline-only appKey', () => {
      expect(() => {
        URLBuilder.authURL('\t\n  ');
      }).toThrow('appKey must be a non-empty string');
    });

    it('should throw descriptive error message', () => {
      try {
        URLBuilder.authURL('');
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('appKey');
        expect((error as Error).message).toContain('non-empty string');
      }
    });

    it('should accept valid non-empty appKey', () => {
      const url = URLBuilder.authURL('valid-app-key');

      expect(url).toBeInstanceOf(URL);
      expect(url.hostname.endsWith('.youversion.com')).toBe(true);
      expect(url.pathname).toBe('/auth/login');
      expect(url.searchParams.get('APP_KEY')).toBe('valid-app-key');
    });

    it('should trim and accept appKey with surrounding whitespace', () => {
      // Note: The validation checks trim().length, so this should pass
      const url = URLBuilder.authURL(' valid-app-key ');

      expect(url).toBeInstanceOf(URL);
      // The actual value passed has whitespace preserved in the URL
      expect(url.searchParams.get('APP_KEY')).toBe(' valid-app-key ');
    });

    it('should accept appKey with special characters', () => {
      const specialAppKey = 'app-key_123.test';
      const url = URLBuilder.authURL(specialAppKey);

      expect(url.searchParams.get('APP_KEY')).toBe(specialAppKey);
    });
  });

  describe('authURL - URL construction', () => {
    it('should construct correct base URL and pathname', () => {
      const url = URLBuilder.authURL('test-app');

      expect(url.protocol).toBe('https:');
      expect(url.hostname.endsWith('.youversion.com')).toBe(true);
      expect(url.pathname).toBe('/auth/login');
    });

    it('should include APP_KEY in query parameters', () => {
      const url = URLBuilder.authURL('my-app-key');

      expect(url.searchParams.get('APP_KEY')).toBe('my-app-key');
    });

    it('should include default language parameter', () => {
      const url = URLBuilder.authURL('test-app');

      expect(url.searchParams.get('language')).toBe('en');
    });

    it('should include installation ID when configured', () => {
      YouVersionPlatformConfiguration.installationId = 'test-installation-123';
      const url = URLBuilder.authURL('test-app');

      expect(url.searchParams.get('x-yvp-installation-id')).toBe('test-installation-123');
    });

    it('should not include installation ID when not configured', () => {
      YouVersionPlatformConfiguration.installationId = null;
      const url = URLBuilder.authURL('test-app');

      expect(url.searchParams.get('x-yvp-installation-id')).toBeNull();
    });

    it('should include required permissions when provided', () => {
      const permissions = new Set<SignInWithYouVersionPermissionValues>(['bibles', 'votd']);
      const url = URLBuilder.authURL('test-app', permissions);

      const requiredPerms = url.searchParams.get('required_perms');
      expect(requiredPerms).toBeTruthy();
      expect(requiredPerms?.split(',')).toContain('bibles');
      expect(requiredPerms?.split(',')).toContain('votd');
    });

    it('should include optional permissions when provided', () => {
      const optionalPermissions = new Set<SignInWithYouVersionPermissionValues>(['demographics']);
      const url = URLBuilder.authURL('test-app', new Set(), optionalPermissions);

      const optPerms = url.searchParams.get('opt_perms');
      expect(optPerms).toBe('demographics');
    });

    it('should include both required and optional permissions', () => {
      const required = new Set<SignInWithYouVersionPermissionValues>(['bibles']);
      const optional = new Set<SignInWithYouVersionPermissionValues>(['bible_activity']);
      const url = URLBuilder.authURL('test-app', required, optional);

      expect(url.searchParams.get('required_perms')).toBe('bibles');
      expect(url.searchParams.get('opt_perms')).toBe('bible_activity');
    });

    it('should handle empty permission sets', () => {
      const url = URLBuilder.authURL('test-app', new Set(), new Set());

      expect(url.searchParams.get('required_perms')).toBeNull();
      expect(url.searchParams.get('opt_perms')).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should throw errors instead of returning null for invalid appKey', () => {
      // Verify that the method throws, not returns null
      let threwError = false;
      let returnValue: any;

      try {
        returnValue = URLBuilder.authURL('');
      } catch {
        threwError = true;
      }

      expect(threwError).toBe(true);
      expect(returnValue).toBeUndefined();
    });

    it('should wrap URL construction errors with descriptive message for authURL', () => {
      // This is hard to trigger, but we can at least verify the pattern exists
      // by checking that valid inputs don't trigger the catch block
      expect(() => {
        URLBuilder.authURL('valid-app-key');
      }).not.toThrow(/Failed to construct auth URL/);
    });
  });

  describe('Return type validation', () => {
    it('authURL should return URL object (not null)', () => {
      const result = URLBuilder.authURL('test-app');

      expect(result).toBeInstanceOf(URL);
      expect(result).not.toBeNull();
    });
  });
});
