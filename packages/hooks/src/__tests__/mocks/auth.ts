import { vi } from 'vitest';
import { SignInWithYouVersionResult, YouVersionUserInfo } from '@youversion/platform-core';

/**
 * Creates a mock user info object for testing
 * @param overrides Optional properties to override the default values
 */
export const createMockUserInfo = (overrides: Record<string, any> = {}): YouVersionUserInfo => {
  const mockUserInfo = new YouVersionUserInfo({
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg?w={width}&h={height}',
    ...overrides,
  });

  // Mock the getAvatarUrl method for testing
  vi.spyOn(mockUserInfo, 'getAvatarUrl').mockImplementation((width = 200, height = 200) => {
    try {
      return new URL(`https://example.com/avatar.jpg?w=${width}&h=${height}`);
    } catch {
      return null;
    }
  });

  return mockUserInfo;
};

/**
 * Creates a mock auth result for testing
 * @param overrides Optional properties to override the default values
 */
export const createMockAuthResult = (
  overrides: Record<string, unknown> = {},
): SignInWithYouVersionResult => {
  const mockUserInfo = createMockUserInfo();
  return new SignInWithYouVersionResult({
    ...mockUserInfo,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    yvpUserId: 'test-yvp-user-id',
    profilePicture: 'https://example.com/profile.jpg',
    ...overrides,
  });
};
