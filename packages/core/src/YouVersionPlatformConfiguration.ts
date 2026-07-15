import { YouVersionUserInfoJSONSchema, type YouVersionUserInfoJSON } from './schemas/user-info';
import { getLocalStorage } from './web-storage';

/**
 * Security Note: Tokens and the decoded user profile are stored in localStorage
 * for persistence. The ID token itself is never persisted — it is decoded once at
 * sign-in to derive the user profile and then discarded.
 * Ensure your application follows XSS prevention best practices:
 * - Sanitize user input
 * - Use Content Security Policy headers
 * - Avoid innerHTML with untrusted content
 */
export class YouVersionPlatformConfiguration {
  private static _appKey: string | null = null;
  private static _installationId: string | null = null;
  private static _apiHost: string = 'api.youversion.com';
  private static _refreshTokenKey: string | null = null;
  private static _expiryDateKey: string | null = null;

  private static getOrSetInstallationId(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    // Storage may be unusable (e.g. Node's experimental `localStorage` global
    // that is `undefined` without `--localstorage-file`). The installation id
    // is still generated; it just lives in memory (via the `_installationId`
    // cache) instead of persisting across sessions.
    const storage = getLocalStorage();
    const existingId = storage?.getItem('x-yvp-installation-id');
    if (existingId) {
      return existingId;
    }

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `yvp-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 10)}`;
    storage?.setItem('x-yvp-installation-id', newId);
    return newId;
  }

  public static saveAuthData(
    accessToken: string | null,
    refreshToken: string | null,
    expiryDate: Date | null,
  ): void {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    if (accessToken !== null) {
      storage.setItem('accessToken', accessToken);
    } else {
      storage.removeItem('accessToken');
    }

    if (refreshToken !== null) {
      storage.setItem('refreshToken', refreshToken);
    } else {
      storage.removeItem('refreshToken');
    }

    if (expiryDate !== null) {
      storage.setItem('expiryDate', expiryDate.toISOString());
    } else {
      storage.removeItem('expiryDate');
    }
  }

  /**
   * Persists the decoded user profile derived from the ID token at sign-in.
   * Pass `null` to remove any stored profile.
   */
  public static saveUserInfo(userInfo: YouVersionUserInfoJSON | null): void {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    if (userInfo !== null) {
      storage.setItem('userInfo', JSON.stringify(userInfo));
    } else {
      storage.removeItem('userInfo');
    }
  }

  public static clearAuthTokens(): void {
    this.saveAuthData(null, null, null);
    this.saveUserInfo(null);
  }

  public static get accessToken(): string | null {
    return getLocalStorage()?.getItem('accessToken') ?? null;
  }

  public static get refreshToken(): string | null {
    return getLocalStorage()?.getItem('refreshToken') ?? null;
  }

  /**
   * Returns the persisted user profile, validated against the expected schema.
   * Returns `null` when nothing is stored or the stored value is malformed.
   */
  public static get storedUserInfo(): YouVersionUserInfoJSON | null {
    const raw = getLocalStorage()?.getItem('userInfo');
    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const result = YouVersionUserInfoJSONSchema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  public static get tokenExpiryDate(): Date | null {
    const dateString = getLocalStorage()?.getItem('expiryDate');
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
