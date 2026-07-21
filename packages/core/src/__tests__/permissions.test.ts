/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { parseGrantedPermissions } from '../permissions';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';

describe('parseGrantedPermissions', () => {
  it('parses a single value', () => {
    const params = new URLSearchParams('granted_permissions=highlights');
    expect(parseGrantedPermissions(params)).toEqual(['highlights']);
  });

  it('splits comma- and space-separated values and de-duplicates', () => {
    const params = new URLSearchParams('granted_permissions=highlights,votd%20bibles');
    expect(parseGrantedPermissions(params)).toEqual(['highlights', 'votd', 'bibles']);
  });

  it('unions repeated params', () => {
    const params = new URLSearchParams(
      'granted_permissions=highlights&granted_permissions=votd,highlights',
    );
    expect(parseGrantedPermissions(params)).toEqual(['highlights', 'votd']);
  });

  it('returns [] when the param is absent', () => {
    expect(parseGrantedPermissions(new URLSearchParams('state=x'))).toEqual([]);
  });
});

describe('YouVersionPlatformConfiguration permission cache', () => {
  const storageKey = 'youversion-platform:granted-permissions';

  beforeEach(() => {
    localStorage.clear();
    // The cache is scoped to the signed-in user; establish one for the cases
    // that exercise reads/writes for a single user.
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a' });
  });

  it('starts empty and merges granted permissions without duplicates', () => {
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(false);

    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights', 'votd']);

    expect(YouVersionPlatformConfiguration.grantedPermissions.sort()).toEqual([
      'highlights',
      'votd',
    ]);
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(true);
  });

  it('removeGrantedPermission honors a server 401/403 invalidation', () => {
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights', 'votd']);
    YouVersionPlatformConfiguration.removeGrantedPermission('highlights');
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(false);
    expect(YouVersionPlatformConfiguration.hasPermission('votd')).toBe(true);
  });

  it('clearAuthTokens also clears the permission cache', () => {
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
    YouVersionPlatformConfiguration.clearAuthTokens();
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
  });

  it('tolerates malformed stored JSON', () => {
    localStorage.setItem(storageKey, '{not json');
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
  });

  it('ignores the legacy bare-array format', () => {
    localStorage.setItem(storageKey, JSON.stringify(['highlights']));
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(false);
  });

  it('returns [] when signed out even if an entry is stored', () => {
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual(['highlights']);

    // Drop the user without clearing the cache entry.
    YouVersionPlatformConfiguration.saveUserInfo(null);
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
  });

  describe('user scoping (security)', () => {
    it('does not leak grants to a different user who signs in without clearAuthTokens', () => {
      // User A grants highlights.
      YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
      expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(true);

      // User B signs in (new session) without clearAuthTokens first.
      YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-b' });

      // B must not inherit A's grant.
      expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
      expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(false);
    });

    it("a callback without a granted_permissions echo does not resurrect the prior user's grants", () => {
      YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
      YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-b' });

      // A `granted` return with no permissions echoed → nothing is saved.
      // B's cache stays empty rather than falling back to A's entry.
      expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
    });

    it('a different user replaces the entry wholesale on the next save', () => {
      YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights', 'votd']);

      YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-b' });
      YouVersionPlatformConfiguration.saveGrantedPermissions(['bibles']);

      // Only B's grant is present; A's are gone.
      expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual(['bibles']);

      // And A cannot read them back either.
      YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a' });
      expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
    });
  });
});
