import { describe, it, expect } from 'vitest';
import type { YouVersionUserInfoJSON } from '../YouVersionUserInfo';
import { YouVersionUserInfo } from '../YouVersionUserInfo';

describe('YouVersionUserInfo', () => {
  describe('constructor', () => {
    it('should create instance with valid data', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        last_name: 'Doe',
        id: 'user123',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.firstName).toBe('John');
      expect(userInfo.lastName).toBe('Doe');
      expect(userInfo.userId).toBe('user123');
      expect(userInfo.avatarUrlFormat).toBe('https://example.com/avatar/{width}x{height}.jpg');
    });

    it('should create instance with partial data', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'Jane',
        id: 'user456',
      };

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.firstName).toBe('Jane');
      expect(userInfo.lastName).toBeUndefined();
      expect(userInfo.userId).toBe('user456');
      expect(userInfo.avatarUrlFormat).toBeUndefined();
    });

    it('should create instance with empty object', () => {
      const userData: YouVersionUserInfoJSON = {};

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.firstName).toBeUndefined();
      expect(userInfo.lastName).toBeUndefined();
      expect(userInfo.userId).toBeUndefined();
      expect(userInfo.avatarUrlFormat).toBeUndefined();
    });

    it('should throw error for null data', () => {
      expect(() => {
        new YouVersionUserInfo(null as any);
      }).toThrow('Invalid user data provided');
    });

    it('should throw error for undefined data', () => {
      expect(() => {
        new YouVersionUserInfo(undefined as any);
      }).toThrow('Invalid user data provided');
    });

    it('should throw error for non-object data', () => {
      expect(() => {
        new YouVersionUserInfo('invalid data' as any);
      }).toThrow('Invalid user data provided');

      expect(() => {
        new YouVersionUserInfo(123 as any);
      }).toThrow('Invalid user data provided');

      expect(() => {
        new YouVersionUserInfo(true as any);
      }).toThrow('Invalid user data provided');
    });
  });

  describe('getAvatarUrl', () => {
    it('should return null when avatarUrlFormat is undefined', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        id: 'user123',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl();

      expect(avatarUrl).toBeNull();
    });

    it('should return null when avatarUrlFormat is empty string', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        id: 'user123',
        avatar_url: '',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl();

      expect(avatarUrl).toBeNull();
    });

    it('should replace width and height placeholders with default values', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl();

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/200x200.jpg');
    });

    it('should replace width and height placeholders with custom values', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(100, 150);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/100x150.jpg');
    });

    it('should handle URL starting with // by adding https:', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: '//example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(50, 75);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/50x75.jpg');
    });

    it('should handle URL without placeholders', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/static-avatar.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(100, 100);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/static-avatar.jpg');
    });

    it('should handle URL with only width placeholder', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/w{width}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(300, 400);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/w300.jpg');
    });

    it('should handle URL with only height placeholder', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/h{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(300, 400);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/h400.jpg');
    });

    it('should not handle multiple occurrences of placeholders', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}/thumb_{height}_{width}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(120, 80);

      expect(avatarUrl).toBeInstanceOf(URL);
      // URL constructor encodes curly braces, so {width} becomes %7Bwidth%7D
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/120/thumb_80_%7Bwidth%7D.jpg');
    });

    it('should return null for malformed URLs', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'not-a-valid-url-{width}x{height}',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl();

      expect(avatarUrl).toBeNull();
    });

    it('should handle zero width and height', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(0, 0);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/0x0.jpg');
    });

    it('should handle negative width and height', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(-100, -50);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/-100x-50.jpg');
    });

    it('should handle large width and height values', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(9999, 8888);

      expect(avatarUrl).toBeInstanceOf(URL);
      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/9999x8888.jpg');
    });
  });

  describe('avatarUrl getter', () => {
    it('should return same result as getAvatarUrl() with default parameters', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const getterResult = userInfo.avatarUrl;
      const methodResult = userInfo.getAvatarUrl();

      expect(getterResult).toEqual(methodResult);
      expect(getterResult?.toString()).toBe('https://example.com/avatar/200x200.jpg');
    });

    it('should return null when avatarUrlFormat is undefined', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        id: 'user123',
      };

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.avatarUrl).toBeNull();
    });

    it('should return null for malformed URLs', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'John',
        avatar_url: 'invalid-url-format',
      };

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.avatarUrl).toBeNull();
    });
  });

  describe('edge cases and real-world scenarios', () => {
    it('should handle typical YouVersion API response format', () => {
      const userData: YouVersionUserInfoJSON = {
        id: '12345',
        first_name: 'Sarah',
        last_name: 'Johnson',
        avatar_url: '//images.youversion.com/users/12345/{width}x{height}/avatar.jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.userId).toBe('12345');
      expect(userInfo.firstName).toBe('Sarah');
      expect(userInfo.lastName).toBe('Johnson');

      const avatarUrl = userInfo.getAvatarUrl(150, 150);
      expect(avatarUrl?.toString()).toBe(
        'https://images.youversion.com/users/12345/150x150/avatar.jpg',
      );
    });

    it('should handle user with no last name', () => {
      const userData: YouVersionUserInfoJSON = {
        id: 'user789',
        first_name: 'Madonna',
        avatar_url: 'https://cdn.example.com/{width}/{height}/user.png',
      };

      const userInfo = new YouVersionUserInfo(userData);

      expect(userInfo.firstName).toBe('Madonna');
      expect(userInfo.lastName).toBeUndefined();
      expect(userInfo.avatarUrl?.toString()).toBe('https://cdn.example.com/200/200/user.png');
    });

    it('should handle complex URL with query parameters', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'Alex',
        avatar_url: 'https://api.service.com/v1/avatar?user=123&w={width}&h={height}&format=jpg',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(64, 64);

      expect(avatarUrl?.toString()).toBe(
        'https://api.service.com/v1/avatar?user=123&w=64&h=64&format=jpg',
      );
    });

    it('should handle URL with fragment identifier', () => {
      const userData: YouVersionUserInfoJSON = {
        first_name: 'Taylor',
        avatar_url: 'https://example.com/avatar/{width}x{height}.jpg#section1',
      };

      const userInfo = new YouVersionUserInfo(userData);
      const avatarUrl = userInfo.getAvatarUrl(128, 128);

      expect(avatarUrl?.toString()).toBe('https://example.com/avatar/128x128.jpg#section1');
    });
  });
});
