/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/explicit-module-boundary-types */
import { vi } from 'vitest';

// Shared mock classes for YouVersionUserInfo and SignInWithYouVersionResult
// Used by useYVAuth.test.tsx and YouVersionAuthProvider.test.tsx

export class MockYouVersionUserInfo {
  readonly name?: string;
  readonly userId?: string;
  readonly email?: string;
  readonly avatarUrlFormat?: string;

  constructor(data: any) {
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

export class MockSignInWithYouVersionResult {
  accessToken: string | undefined;
  expiryDate: Date | undefined;
  refreshToken: string | undefined;
  idToken: string | undefined;
  yvpUserId: string | undefined;
  name: string | undefined;
  profilePicture: string | undefined;
  email: string | undefined;

  constructor(props: {
    accessToken?: string;
    expiresIn?: number;
    refreshToken?: string;
    idToken?: string;
    yvpUserId?: string;
    name?: string;
    profilePicture?: string;
    email?: string;
  }) {
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

/**
 * Creates a mock factory for @youversion/platform-core with a simple
 * configuration object (direct property access). Used by useYVAuth tests.
 */
export function createSimpleCoreMockFactory() {
  const mockConfiguration = {
    accessToken: null as string | null,
    idToken: null as string | null,
    refreshToken: null as string | null,
    appKey: '',
    apiHost: 'test-api.example.com',
    installationId: null as string | null,
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
      user: 'user',
    },
    YouVersionUserInfo: MockYouVersionUserInfo,
    SignInWithYouVersionResult: MockSignInWithYouVersionResult,
  };
}

/**
 * Creates a mock factory for @youversion/platform-core with getter/setter
 * configuration (reactive token access). Used by YouVersionAuthProvider tests.
 */
export function createGetterCoreMockFactory() {
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
