import { vi } from 'vitest';

/**
 * Creates a mock YouVersionPlatformConfiguration for testing
 * Maintains internal state for access tokens and configuration
 */
export const createMockPlatformConfiguration = (): {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  appKey: string;
  apiHost: string;
  installationId: string | null;
  expiryDate: Date | null;
  clearAuthTokens: ReturnType<typeof vi.fn>;
  saveAuthData: ReturnType<typeof vi.fn>;
} => {
  const config = {
    accessToken: null as string | null,
    idToken: null as string | null,
    refreshToken: null as string | null,
    appKey: '',
    apiHost: 'test-api.example.com',
    installationId: null as string | null,
    expiryDate: null as Date | null,
    clearAuthTokens: vi.fn(function (this: typeof config) {
      this.accessToken = null;
      this.idToken = null;
      this.refreshToken = null;
      this.expiryDate = null;
    }),
    saveAuthData: vi.fn(function (
      this: typeof config,
      accessToken: string | null,
      refreshToken: string | null,
      idToken: string | null,
      expiryDate?: Date | null,
    ) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.idToken = idToken;
      if (expiryDate !== undefined) {
        this.expiryDate = expiryDate;
      }
    }),
  };

  // Bind methods to maintain context
  config.clearAuthTokens = config.clearAuthTokens.bind(config);
  config.saveAuthData = config.saveAuthData.bind(config);

  return config;
};
