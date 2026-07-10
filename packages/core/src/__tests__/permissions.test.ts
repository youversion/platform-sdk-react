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
  beforeEach(() => {
    localStorage.clear();
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

  it('setGrantedPermissions overwrites the cache (reconcile)', () => {
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights', 'votd']);
    YouVersionPlatformConfiguration.setGrantedPermissions(['highlights']);
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual(['highlights']);
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
    localStorage.setItem('youversion-platform:granted-permissions', '{not json');
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
  });
});
