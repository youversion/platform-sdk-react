import { vi, type MockedFunction } from 'vitest';
import type { YouVersionAPIUsers } from '@youversion/platform-core';

interface MockUserInfoData {
  name?: string;
  id?: string;
  email?: string;
  avatar_url?: string;
}

interface MockAuthResultProps {
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
  idToken?: string;
  yvpUserId?: string;
  name?: string;
  profilePicture?: string;
  email?: string;
}

class MockYouVersionUserInfo {
  readonly name?: string;
  readonly userId?: string;
  readonly email?: string;
  readonly avatarUrlFormat?: string;

  constructor(data: MockUserInfoData) {
    this.name = data.name;
    this.userId = data.id;
    this.email = data.email;
    this.avatarUrlFormat = data.avatar_url;
  }

  getAvatarUrl(width: number = 200, height: number = 200): URL | null {
    if (!this.avatarUrlFormat) {
      return null;
    }
    try {
      let urlString = this.avatarUrlFormat;
      if (urlString.startsWith('//')) {
        urlString = 'https:' + urlString;
      }
      urlString = urlString.replace('{width}', width.toString());
      urlString = urlString.replace('{height}', height.toString());
      return new URL(urlString);
    } catch {
      return null;
    }
  }

  get avatarUrl(): URL | null {
    return this.getAvatarUrl();
  }
}

class MockSignInWithYouVersionResult {
  readonly accessToken: string | undefined;
  readonly expiryDate: Date | undefined;
  readonly refreshToken: string | undefined;
  readonly idToken: string | undefined;
  readonly yvpUserId: string | undefined;
  readonly name: string | undefined;
  readonly profilePicture: string | undefined;
  readonly email: string | undefined;

  constructor(props: MockAuthResultProps) {
    this.accessToken = props.accessToken;
    this.expiryDate = props.expiresIn ? new Date(Date.now() + props.expiresIn * 1000) : new Date();
    this.refreshToken = props.refreshToken;
    this.idToken = props.idToken;
    this.yvpUserId = props.yvpUserId;
    this.name = props.name;
    this.profilePicture = props.profilePicture;
    this.email = props.email;
  }
}

interface MockConfiguration {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  appKey: string;
  apiHost: string;
  installationId: string | null;
  clearAuthTokens: MockedFunction<() => void>;
  saveAuthData: MockedFunction<
    (
      accessToken: string | null,
      refreshToken: string | null,
      idToken: string | null,
      installationId: string | null,
    ) => void
  >;
}

interface SimpleCoreMockFactory {
  YouVersionAPIUsers: {
    signIn: MockedFunction<typeof YouVersionAPIUsers.signIn>;
    handleAuthCallback: MockedFunction<typeof YouVersionAPIUsers.handleAuthCallback>;
    userInfo: MockedFunction<typeof YouVersionAPIUsers.userInfo>;
    refreshTokenIfNeeded: MockedFunction<typeof YouVersionAPIUsers.refreshTokenIfNeeded>;
  };
  YouVersionPlatformConfiguration: MockConfiguration;
  SignInWithYouVersionPermission: Record<string, string>;
  YouVersionUserInfo: typeof MockYouVersionUserInfo;
  SignInWithYouVersionResult: typeof MockSignInWithYouVersionResult;
}

interface GetterCoreMockFactory {
  YouVersionAPIUsers: {
    handleAuthCallback: MockedFunction<typeof YouVersionAPIUsers.handleAuthCallback>;
    userInfo: MockedFunction<typeof YouVersionAPIUsers.userInfo>;
    refreshTokenIfNeeded: MockedFunction<typeof YouVersionAPIUsers.refreshTokenIfNeeded>;
  };
  YouVersionPlatformConfiguration: {
    appKey: string;
    installationId: string;
    apiHost: string;
    readonly idToken: string | null;
    readonly refreshToken: string | null;
    readonly accessToken: string | null;
    clearAuthTokens: MockedFunction<() => void>;
    saveAuthData: MockedFunction<
      (accessToken: string | null, refreshToken: string | null, idToken: string | null) => void
    >;
  };
  YouVersionUserInfo: typeof MockYouVersionUserInfo;
  SignInWithYouVersionResult: typeof MockSignInWithYouVersionResult;
}

export function createSimpleCoreMockFactory(): SimpleCoreMockFactory {
  const mockConfiguration: MockConfiguration = {
    accessToken: null,
    idToken: null,
    refreshToken: null,
    appKey: '',
    apiHost: 'test-api.example.com',
    installationId: null,
    clearAuthTokens: vi.fn(() => {
      mockConfiguration.accessToken = null;
      mockConfiguration.idToken = null;
      mockConfiguration.refreshToken = null;
    }),
    saveAuthData: vi.fn(
      (
        accessToken: string | null,
        refreshToken: string | null,
        idToken: string | null,
        installationId: string | null,
      ) => {
        mockConfiguration.accessToken = accessToken;
        mockConfiguration.refreshToken = refreshToken;
        mockConfiguration.idToken = idToken;
        mockConfiguration.installationId = installationId;
      },
    ),
  };

  return {
    YouVersionAPIUsers: {
      signIn: vi.fn(),
      handleAuthCallback: vi.fn(),
      userInfo: vi.fn(),
      refreshTokenIfNeeded: vi.fn(),
    },
    YouVersionPlatformConfiguration: mockConfiguration,
    SignInWithYouVersionPermission: {
      bibles: 'bibles',
      highlights: 'highlights',
      votd: 'votd',
      demographics: 'demographics',
      bibleActivity: 'bible_activity',
    },
    YouVersionUserInfo: MockYouVersionUserInfo,
    SignInWithYouVersionResult: MockSignInWithYouVersionResult,
  };
}

export function createGetterCoreMockFactory(): GetterCoreMockFactory {
  let mockInstallationId = 'auto-generated-installation-id';
  let mockIdToken: string | null = null;
  let mockRefreshToken: string | null = null;
  let mockAccessToken: string | null = null;

  return {
    YouVersionAPIUsers: {
      handleAuthCallback: vi.fn(),
      userInfo: vi.fn(),
      refreshTokenIfNeeded: vi.fn(),
    },
    YouVersionPlatformConfiguration: {
      appKey: '',
      get installationId() {
        return mockInstallationId;
      },
      set installationId(value) {
        if (value) mockInstallationId = value;
      },
      apiHost: 'test-api.example.com',
      get idToken() {
        return mockIdToken;
      },
      get refreshToken() {
        return mockRefreshToken;
      },
      get accessToken() {
        return mockAccessToken;
      },
      clearAuthTokens: vi.fn(() => {
        mockIdToken = null;
        mockRefreshToken = null;
        mockAccessToken = null;
      }),
      saveAuthData: vi.fn(
        (accessToken: string | null, refreshToken: string | null, idToken: string | null) => {
          mockAccessToken = accessToken;
          mockRefreshToken = refreshToken;
          mockIdToken = idToken;
        },
      ),
    },
    YouVersionUserInfo: MockYouVersionUserInfo,
    SignInWithYouVersionResult: MockSignInWithYouVersionResult,
  };
}
