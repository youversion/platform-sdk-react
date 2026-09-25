/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';

describe('YouVersionPlatformConfiguration storage contracts', () => {
  it('persists a stable installation id instead of minting one on every access', () => {
    localStorage.clear();
    const generatedId = '550e8400-e29b-41d4-a716-446655440000';
    const randomUUID = vi.spyOn(crypto, 'randomUUID').mockReturnValue(generatedId);

    YouVersionPlatformConfiguration.installationId = null;
    expect(YouVersionPlatformConfiguration.installationId).toBe(generatedId);
    YouVersionPlatformConfiguration.installationId = null;
    expect(YouVersionPlatformConfiguration.installationId).toBe(generatedId);
    expect(randomUUID).toHaveBeenCalledTimes(1);

    randomUUID.mockRestore();
  });

  it('does not persist an ID token with the browser session', () => {
    localStorage.clear();

    YouVersionPlatformConfiguration.saveAuthData(
      'access-token',
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
    );

    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    expect(localStorage.getItem('idToken')).toBeNull();
  });

  it('removes a persisted session and profile on sign-out', () => {
    localStorage.clear();
    YouVersionPlatformConfiguration.saveAuthData(
      'access-token',
      'refresh-token',
      new Date('2026-01-01T00:00:00Z'),
    );
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-123' });

    const sessionKeys = ['accessToken', 'refreshToken', 'expiryDate', 'userInfo'];
    for (const key of sessionKeys) expect(localStorage.getItem(key)).not.toBeNull();

    YouVersionPlatformConfiguration.clearAuthTokens();

    for (const key of sessionKeys) expect(localStorage.getItem(key)).toBeNull();
  });

  it('fails closed when stored user information is malformed or untrusted', () => {
    localStorage.setItem('userInfo', 'not-json{');
    expect(YouVersionPlatformConfiguration.storedUserInfo).toBeNull();

    localStorage.setItem('userInfo', JSON.stringify({ id: 42 }));
    expect(YouVersionPlatformConfiguration.storedUserInfo).toBeNull();
  });

  it('reports rejected storage writes and degrades safely when storage is unavailable', () => {
    const originalStorage = localStorage;
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
    vi.stubGlobal('localStorage', originalStorage);
  });
});
