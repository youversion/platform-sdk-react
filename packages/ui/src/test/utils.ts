import type { YouVersionUserInfo } from '@youversion/platform-core';
import { spyOn } from 'storybook/test';

export type MockAuthUserOptions = {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
};

export async function setupAuthenticatedUser(
  options: MockAuthUserOptions = {},
): Promise<YouVersionUserInfo> {
  const { YouVersionAPIUsers, YouVersionPlatformConfiguration, YouVersionUserInfo } = await import(
    '@youversion/platform-core'
  );

  YouVersionPlatformConfiguration.saveAuthData('mock-access-token', 'mock-refresh-token', null);

  YouVersionPlatformConfiguration.saveUserInfo({
    id: options.id ?? 'mock-user-id',
    name: options.name ?? 'Test User',
    email: options.email ?? 'test@example.com',
    avatar_url: options.avatarUrl ?? undefined,
  });

  const mockUserInfo = new YouVersionUserInfo({
    id: options.id ?? 'mock-user-id',
    name: options.name ?? 'Test User',
    email: options.email ?? 'test@example.com',
    avatar_url: options.avatarUrl ?? undefined,
  });

  spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded').mockResolvedValue(true);
  spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(mockUserInfo);

  return mockUserInfo;
}
