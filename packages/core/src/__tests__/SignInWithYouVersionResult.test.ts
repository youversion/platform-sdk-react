import { describe, it, expect, vi } from 'vitest';
import { SignInWithYouVersionResult } from '../SignInWithYouVersionResult';

describe('SignInWithYouVersionResult', () => {
  it('sets all properties properly', () => {
    const fixedDate = new Date(2025, 2, 11, 12, 0, 0);
    vi.setSystemTime(fixedDate);
    const result = new SignInWithYouVersionResult({
      accessToken: 'test-access-token',
      expiresIn: 3600,
      refreshToken: 'test-refresh-token',
      yvpUserId: 'test-user-id',
      name: 'test user',
      profilePicture: 'https://this-is-a-test-picture.com',
      email: 'test@example.com',
    });

    expect(result.accessToken).toBe('test-access-token');
    expect(result.expiryDate).toStrictEqual(new Date(fixedDate.getTime() + 60 * 60 * 1000));
    expect(result.refreshToken).toBe('test-refresh-token');
    expect(result.yvpUserId).toBe('test-user-id');
    expect(result.name).toBe('test user');
    expect(result.profilePicture).toBe('https://this-is-a-test-picture.com');
    expect(result.email).toBe('test@example.com');
  });
});
