import { YouVersionUserInfoJSONSchema, type YouVersionUserInfoJSON } from './schemas/user-info';

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

    const existingId = localStorage.getItem('x-yvp-installation-id');
    if (existingId) {
      return existingId;
    }

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `yvp-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 10)}`;
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

  /**
   * Persists the decoded user profile derived from the ID token at sign-in.
   * Pass `null` to remove any stored profile.
   */
  public static saveUserInfo(userInfo: YouVersionUserInfoJSON | null): void {
    if (userInfo !== null) {
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
    } else {
      localStorage.removeItem('userInfo');
    }
  }

  public static clearAuthTokens(): void {
    this.saveAuthData(null, null, null);
    this.saveUserInfo(null);
    this.clearGrantedPermissions();
  }

  /**
   * Optimistic cache of the data-exchange permissions the server told us are
   * granted (seeded from `granted_permissions` on the sign-in / data-exchange
   * callbacks). It is optimistic only: the server is the source of truth, and a
   * 401/403 on a permissioned request invalidates the relevant entry via
   * {@link removeGrantedPermission}. Stored as a JSON string array.
   */
  private static readonly grantedPermissionsKey = 'youversion-platform:granted-permissions';

  public static get grantedPermissions(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.grantedPermissionsKey);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is string => typeof entry === 'string');
    } catch {
      return [];
    }
  }

  /** Merges `permissions` into the cache (union), preserving existing entries. */
  public static saveGrantedPermissions(permissions: string[]): void {
    if (typeof localStorage === 'undefined') return;
    const merged = new Set([...this.grantedPermissions, ...permissions]);
    localStorage.setItem(this.grantedPermissionsKey, JSON.stringify([...merged]));
  }

  /**
   * Replaces the cache with exactly `permissions` (used to reconcile the cache
   * with the authoritative set the server returns on a data-exchange grant).
   */
  public static setGrantedPermissions(permissions: string[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.grantedPermissionsKey, JSON.stringify([...new Set(permissions)]));
  }

  /** Drops a single permission from the cache — used to honor a server 401/403. */
  public static removeGrantedPermission(permission: string): void {
    if (typeof localStorage === 'undefined') return;
    const next = this.grantedPermissions.filter((entry) => entry !== permission);
    localStorage.setItem(this.grantedPermissionsKey, JSON.stringify(next));
  }

  public static clearGrantedPermissions(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.grantedPermissionsKey);
  }

  /** Optimistic check against the permission cache. Server 401/403 still wins. */
  public static hasPermission(permission: string): boolean {
    return this.grantedPermissions.includes(permission);
  }

  public static get accessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  public static get refreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Returns the persisted user profile, validated against the expected schema.
   * Returns `null` when nothing is stored or the stored value is malformed.
   */
  public static get storedUserInfo(): YouVersionUserInfoJSON | null {
    const raw = localStorage.getItem('userInfo');
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
