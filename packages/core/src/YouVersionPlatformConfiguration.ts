import type { YouVersionUserInfo } from './YouVersionUserInfo';

export class YouVersionPlatformConfiguration {
  private static _appKey: string | null = null;
  private static _installationId: string | null = null;
  private static _accessTokenKey: string | null = null;
  private static _apiHost: string = 'api-staging.youversion.com';
  private static _refreshTokenKey: string | null = null;
  private static _expiryDateKey: string | null = null;

  private static getOrSetInstallationId(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const existingId = localStorage.getItem('x-yvp-installation-id');
    if (existingId) {
      return existingId;
    }

    const newId = crypto.randomUUID();
    localStorage.setItem('x-yvp-installation-id', newId);
    return newId;
  }

  public static saveAuthData(
    accessToken: string | null,
    refreshToken: string | null,
    expiryDate: Date | null,
  ): void {
    if (accessToken !== null) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }

    if (refreshToken !== null) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }

    if (expiryDate !== null) {
      localStorage.setItem('expiryDate', expiryDate.toISOString());
    } else {
      localStorage.removeItem('expiryDate');
    }
  }

  public static clearAuthTokens(): void {
    this.saveAuthData(null, null, null);
  }

  public static get accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  public static get refreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  public static get tokenExpiryDate(): Date | null {
    const dateString = localStorage.getItem('expiryDate');
    return dateString ? new Date(dateString) : null;
  }

  static get appKey(): string | null {
    return this._appKey;
  }

  static set appKey(value: string | null) {
    this._appKey = value;
  }

  static get installationId(): string {
    if (!this._installationId) {
      this._installationId = this.getOrSetInstallationId();
    }
    return this._installationId;
  }

  static set installationId(value: string | null) {
    this._installationId = value || this.getOrSetInstallationId();
  }

  static setAccessToken(token: string | null): void {
    // Validate token: if not null, must be a non-empty string
    if (token !== null && (typeof token !== 'string' || token.trim().length === 0)) {
      throw new Error('Access token must be a non-empty string or null');
    }
    this._accessTokenKey = token;
  }

  static get accessTokenKey(): string | null {
    return this._accessTokenKey;
  }

  static get apiHost(): string {
    return this._apiHost;
  }

  static set apiHost(value: string) {
    this._apiHost = value;
  }

  static get refreshTokenKey(): string | null {
    return this._refreshTokenKey;
  }

  static set refreshTokenKey(value: string) {
    this._refreshTokenKey = value;
  }

  static get expiryDateKey(): string | null {
    return this._expiryDateKey;
  }

  static set expiryDateKey(value: string) {
    this._expiryDateKey = value;
  }
}
