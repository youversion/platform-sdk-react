/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { clearStorage, getLocalStorage, setStorageItem } from '../web-storage';

describe('YouVersionPlatformConfiguration storage contracts', () => {
  it('persists a stable installation id instead of minting one on every access', () => {
    clearStorage(getLocalStorage());
    const generatedId = '550e8400-e29b-41d4-a716-446655440000';
    const randomUUID = vi.spyOn(crypto, 'randomUUID').mockReturnValue(generatedId);

    YouVersionPlatformConfiguration.installationId = null;
    expect(YouVersionPlatformConfiguration.installationId).toBe(generatedId);
    YouVersionPlatformConfiguration.installationId = null;
    expect(YouVersionPlatformConfiguration.installationId).toBe(generatedId);
    expect(randomUUID).toHaveBeenCalledTimes(1);

    randomUUID.mockRestore();
  });

  it('round-trips the session expiry without persisting an ID token', () => {
    const storage = getLocalStorage();
    expect(storage).not.toBeNull();
    clearStorage(storage);
    const expiryDate = new Date('2026-01-01T12:34:56.789Z');

    YouVersionPlatformConfiguration.saveAuthData('access-token', 'refresh-token', expiryDate);

    expect(storage?.getItem('accessToken')).toBe('access-token');
    expect(storage?.getItem('refreshToken')).toBe('refresh-token');
    expect(YouVersionPlatformConfiguration.tokenExpiryDate).toEqual(expiryDate);
    expect(storage?.getItem('idToken')).toBeNull();
  });

  it('removes a persisted session and profile on sign-out', () => {
    const storage = getLocalStorage();
    expect(storage).not.toBeNull();
    clearStorage(storage);
    YouVersionPlatformConfiguration.saveAuthData(
      'access-token',
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
    );
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-123' });

    const sessionKeys = ['accessToken', 'refreshToken', 'expiryDate', 'userInfo'];
    for (const key of sessionKeys) expect(storage?.getItem(key)).not.toBeNull();

    YouVersionPlatformConfiguration.clearAuthTokens();

    for (const key of sessionKeys) expect(storage?.getItem(key)).toBeNull();
  });

  it('fails closed when stored user information is malformed or untrusted', () => {
    const storage = getLocalStorage();
    expect(storage).not.toBeNull();
    clearStorage(storage);
    expect(setStorageItem(storage, 'userInfo', 'not-json{')).toBe(true);
    expect(YouVersionPlatformConfiguration.storedUserInfo).toBeNull();

    expect(setStorageItem(storage, 'userInfo', JSON.stringify({ id: 42 }))).toBe(true);
    expect(YouVersionPlatformConfiguration.storedUserInfo).toBeNull();
  });

  it('reports rejected storage writes and degrades safely when storage is unavailable', () => {
    try {
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => undefined,
      });
      expect(YouVersionPlatformConfiguration.saveAuthData('access', 'refresh', new Date())).toBe(
        false,
      );

      vi.stubGlobal('localStorage', undefined);
      YouVersionPlatformConfiguration.installationId = null;
      expect(YouVersionPlatformConfiguration.installationId).toBe('');
      expect(YouVersionPlatformConfiguration.accessToken).toBeNull();
      expect(() => YouVersionPlatformConfiguration.clearAuthTokens()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
