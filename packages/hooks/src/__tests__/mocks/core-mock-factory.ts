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

/**
 * `YouVersionProvider` constructs one `ApiClient` and puts it on the context, so
 * every core mock that replaces the whole module has to export a constructible
 * `ApiClient` — otherwise any test rendering the provider dies with
 * "ApiClient is not a constructor". These tests exercise auth, not HTTP, so the
 * stub only needs to be `new`-able and to hold its config.
 */
class MockApiClient {
  readonly config: Record<string, unknown>;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }
}

class MockSignInWithYouVersionResult {
  readonly accessToken: string | undefined;
  readonly expiryDate: Date | undefined;
  readonly refreshToken: string | undefined;
  readonly yvpUserId: string | undefined;
  readonly name: string | undefined;
  readonly profilePicture: string | undefined;
  readonly email: string | undefined;

  constructor(props: MockAuthResultProps) {
    this.accessToken = props.accessToken;
    this.expiryDate = props.expiresIn ? new Date(Date.now() + props.expiresIn * 1000) : new Date();
    this.refreshToken = props.refreshToken;
    this.yvpUserId = props.yvpUserId;
    this.name = props.name;
    this.profilePicture = props.profilePicture;
    this.email = props.email;
  }
}

interface MockConfiguration {
  accessToken: string | null;
  refreshToken: string | null;
  storedUserInfo: MockUserInfoData | null;
  appKey: string;
  apiHost: string;
  installationId: string | null;
  clearAuthTokens: MockedFunction<() => void>;
  saveAuthData: MockedFunction<
    (accessToken: string | null, refreshToken: string | null, expiryDate: Date | null) => void
  >;
  saveUserInfo: MockedFunction<(userInfo: MockUserInfoData | null) => void>;
}

interface SimpleCoreMockFactory {
  YouVersionAPIUsers: {
    signIn: MockedFunction<typeof YouVersionAPIUsers.signIn>;
    handleAuthCallback: MockedFunction<typeof YouVersionAPIUsers.handleAuthCallback>;
    userInfo: MockedFunction<typeof YouVersionAPIUsers.userInfo>;
    getStoredUserInfo: MockedFunction<typeof YouVersionAPIUsers.getStoredUserInfo>;
    refreshTokenIfNeeded: MockedFunction<typeof YouVersionAPIUsers.refreshTokenIfNeeded>;
  };
  YouVersionPlatformConfiguration: MockConfiguration;
  SignInWithYouVersionPermission: Record<string, string>;
  YouVersionUserInfo: typeof MockYouVersionUserInfo;
  SignInWithYouVersionResult: typeof MockSignInWithYouVersionResult;
  ApiClient: typeof MockApiClient;
}

interface GetterCoreMockFactory {
  YouVersionAPIUsers: {
    handleAuthCallback: MockedFunction<typeof YouVersionAPIUsers.handleAuthCallback>;
    userInfo: MockedFunction<typeof YouVersionAPIUsers.userInfo>;
    getStoredUserInfo: MockedFunction<typeof YouVersionAPIUsers.getStoredUserInfo>;
    refreshTokenIfNeeded: MockedFunction<typeof YouVersionAPIUsers.refreshTokenIfNeeded>;
  };
  YouVersionPlatformConfiguration: {
    appKey: string;
    installationId: string;
    apiHost: string;
    readonly refreshToken: string | null;
    readonly accessToken: string | null;
    readonly storedUserInfo: MockUserInfoData | null;
    clearAuthTokens: MockedFunction<() => void>;
    saveAuthData: MockedFunction<
      (accessToken: string | null, refreshToken: string | null, expiryDate: Date | null) => void
    >;
    saveUserInfo: MockedFunction<(userInfo: MockUserInfoData | null) => void>;
  };
  YouVersionUserInfo: typeof MockYouVersionUserInfo;
  SignInWithYouVersionResult: typeof MockSignInWithYouVersionResult;
  ApiClient: typeof MockApiClient;
}

export function createSimpleCoreMockFactory(): SimpleCoreMockFactory {
  const mockConfiguration: MockConfiguration = {
    accessToken: null,
    refreshToken: null,
    storedUserInfo: null,
    appKey: '',
    apiHost: 'test-api.example.com',
    installationId: null,
    clearAuthTokens: vi.fn(() => {
      mockConfiguration.accessToken = null;
      mockConfiguration.refreshToken = null;
      mockConfiguration.storedUserInfo = null;
    }),
    saveAuthData: vi.fn(
      (accessToken: string | null, refreshToken: string | null, _expiryDate: Date | null) => {
        mockConfiguration.accessToken = accessToken;
        mockConfiguration.refreshToken = refreshToken;
      },
    ),
    saveUserInfo: vi.fn((userInfo: MockUserInfoData | null) => {
      mockConfiguration.storedUserInfo = userInfo;
    }),
  };

  return {
    YouVersionAPIUsers: {
      signIn: vi.fn(),
      handleAuthCallback: vi.fn(),
      userInfo: vi.fn(),
      getStoredUserInfo: vi.fn(),
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
    ApiClient: MockApiClient,
  };
}

export function createGetterCoreMockFactory(): GetterCoreMockFactory {
  let mockInstallationId = 'auto-generated-installation-id';
  let mockRefreshToken: string | null = null;
  let mockAccessToken: string | null = null;
  let mockStoredUserInfo: MockUserInfoData | null = null;

  return {
    YouVersionAPIUsers: {
      handleAuthCallback: vi.fn(),
      userInfo: vi.fn(),
      getStoredUserInfo: vi.fn(() =>
        mockStoredUserInfo ? new MockYouVersionUserInfo(mockStoredUserInfo) : null,
      ),
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
      get refreshToken() {
        return mockRefreshToken;
      },
      get accessToken() {
        return mockAccessToken;
      },
      get storedUserInfo() {
        return mockStoredUserInfo;
      },
      clearAuthTokens: vi.fn(() => {
        mockRefreshToken = null;
        mockAccessToken = null;
        mockStoredUserInfo = null;
      }),
      saveAuthData: vi.fn(
        (accessToken: string | null, refreshToken: string | null, _expiryDate: Date | null) => {
          mockAccessToken = accessToken;
          mockRefreshToken = refreshToken;
        },
      ),
      saveUserInfo: vi.fn((userInfo: MockUserInfoData | null) => {
        mockStoredUserInfo = userInfo;
      }),
    },
    YouVersionUserInfo: MockYouVersionUserInfo,
    SignInWithYouVersionResult: MockSignInWithYouVersionResult,
    ApiClient: MockApiClient,
  };
}
