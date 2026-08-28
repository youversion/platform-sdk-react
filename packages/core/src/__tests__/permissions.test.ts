/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  // The auth server encodes permission lists with PHP/Rails bracket-array
  // notation (observed live as `requested_permissions[]` on the consent
  // redirect it builds). The grant echo on the return uses the same shape, and
  // `URLSearchParams` treats it as a distinct key from bare
  // `granted_permissions`. See parseGrantedPermissions for the full contract.
  it('parses the bracket-array key the server emits (granted_permissions[])', () => {
    const params = new URLSearchParams('granted_permissions%5B%5D=highlights');
    expect(parseGrantedPermissions(params)).toEqual(['highlights']);
  });

  it('unions repeated bracket-array entries', () => {
    const params = new URLSearchParams(
      'granted_permissions%5B%5D=highlights&granted_permissions%5B%5D=votd',
    );
    expect(parseGrantedPermissions(params)).toEqual(['highlights', 'votd']);
  });

  it('parses indexed bracket-array keys (granted_permissions[0])', () => {
    const params = new URLSearchParams(
      'granted_permissions%5B0%5D=highlights&granted_permissions%5B1%5D=votd',
    );
    expect(parseGrantedPermissions(params)).toEqual(['highlights', 'votd']);
  });

  it('unions bare and bracket-array forms together', () => {
    const params = new URLSearchParams(
      'granted_permissions=highlights&granted_permissions%5B%5D=votd',
    );
    expect(parseGrantedPermissions(params)).toEqual(['highlights', 'votd']);
  });

  it('ignores unrelated keys that merely start with granted_permissions', () => {
    const params = new URLSearchParams('granted_permissions_extra=nope');
    expect(parseGrantedPermissions(params)).toEqual([]);
  });
});

describe('YouVersionPlatformConfiguration permission cache', () => {
  const legacyStorageKey = 'youversion-platform:granted-permissions';
  const storageKey = `${legacyStorageKey}:app-a`;

  beforeEach(() => {
    localStorage.clear();
    YouVersionPlatformConfiguration.appKey = 'app-a';
    // The cache is scoped to the signed-in user; establish one for the cases
    // that exercise reads/writes for a single user.
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a' });
  });

  afterEach(() => {
    YouVersionPlatformConfiguration.appKey = null;
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

  it('ignores an unscoped legacy entry instead of assigning it to the current app', () => {
    localStorage.setItem(
      legacyStorageKey,
      JSON.stringify({ userId: 'user-a', permissions: ['highlights'] }),
    );

    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
  });

  it('keeps grants separate for two app keys used by the same user and origin', () => {
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);

    YouVersionPlatformConfiguration.appKey = 'app-b';
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
    YouVersionPlatformConfiguration.saveGrantedPermissions(['votd']);

    YouVersionPlatformConfiguration.appKey = 'app-a';
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual(['highlights']);

    YouVersionPlatformConfiguration.appKey = 'app-b';
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual(['votd']);
  });

  it('keeps pending data-exchange state separate for each app key', () => {
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();
    expect(YouVersionPlatformConfiguration.dataExchangeInitiator).toBe('user-a');

    YouVersionPlatformConfiguration.appKey = 'app-b';
    expect(YouVersionPlatformConfiguration.dataExchangeInitiator).toBeNull();

    YouVersionPlatformConfiguration.appKey = 'app-a';
    expect(YouVersionPlatformConfiguration.dataExchangeInitiator).toBe('user-a');
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
