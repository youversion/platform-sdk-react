import { expect, it } from 'vitest';
import { YouVersionUserInfo } from '../YouVersionUserInfo';

it('maps an API profile and expands the protocol-relative avatar template', () => {
  const user = new YouVersionUserInfo({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: '//images.youversion.com/users/{width}x{height}/avatar.jpg',
  });

  expect(user.userId).toBe('user-123');
  expect(user.name).toBe('Test User');
  expect(user.email).toBe('test@example.com');
  expect(user.getAvatarUrl(150, 100)?.toString()).toBe(
    'https://images.youversion.com/users/150x100/avatar.jpg',
  );
});

it('returns no avatar when the API omits it or supplies a malformed URL', () => {
  expect(new YouVersionUserInfo({ id: 'user-123' }).avatarUrl).toBeNull();
  expect(new YouVersionUserInfo({ avatar_url: 'not-a-url' }).avatarUrl).toBeNull();
});

it('rejects non-object API profile data at runtime', () => {
  // SAFETY: Bypass the typed constructor to exercise validation of an untrusted null response.
  expect(() => new YouVersionUserInfo(null as never)).toThrow('Invalid user data provided');
  // SAFETY: Bypass the typed constructor to exercise validation of an untrusted string response.
  expect(() => new YouVersionUserInfo('invalid' as never)).toThrow('Invalid user data provided');
});
