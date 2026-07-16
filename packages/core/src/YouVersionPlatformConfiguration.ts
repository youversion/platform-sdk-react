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
  private static _signInPromptMessage: string | undefined = undefined;
  private static _appName: string | undefined = undefined;

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
    this.clearDataExchangeInitiator();
  }

  /**
   * Optimistic cache of the data-exchange permissions the server told us are
   * granted (seeded from `granted_permissions` on the sign-in / data-exchange
   * callbacks). It is optimistic only: the server is the source of truth, and a
   * 401/403 on a permissioned request invalidates the relevant entry via
   * {@link removeGrantedPermission}.
   *
   * The cache is scoped to the signed-in user: it is persisted as
   * `{ userId, permissions }` and only read back when `userId` matches the
   * current {@link storedUserInfo}. This prevents one user's grants from leaking
   * to a later user who signs in without a {@link clearAuthTokens} in between.
   */
  private static readonly grantedPermissionsKey = 'youversion-platform:granted-permissions';

  /** The id of the user the cache is scoped to, or `null` when signed out. */
  private static get currentUserId(): string | null {
    return this.storedUserInfo?.id ?? null;
  }

  /**
   * Reads the stored `{ userId, permissions }` entry, or `null` when absent,
   * malformed, or in the legacy bare-array format (which is treated as absent).
   */
  private static readStoredGrants(): { userId: string; permissions: string[] } | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.grantedPermissionsKey);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const record = parsed as Record<string, unknown>;
      // Reject the legacy bare-array format and any other malformed shape.
      if (typeof record.userId !== 'string' || !Array.isArray(record.permissions)) {
        return null;
      }
      return {
        userId: record.userId,
        permissions: record.permissions.filter(
          (entry): entry is string => typeof entry === 'string',
        ),
      };
    } catch {
      return null;
    }
  }

  private static writeStoredGrants(userId: string, permissions: string[]): void {
    localStorage.setItem(this.grantedPermissionsKey, JSON.stringify({ userId, permissions }));
  }

  public static get grantedPermissions(): string[] {
    const userId = this.currentUserId;
    if (!userId) return [];
    const stored = this.readStoredGrants();
    if (stored?.userId !== userId) return [];
    return stored.permissions;
  }

  /**
   * Merges `permissions` into the cache (union) when the cached entry belongs to
   * the current user; a different (or absent) owner is replaced wholesale.
   * No-ops when signed out, since grants must be scoped to a user.
   */
  public static saveGrantedPermissions(permissions: string[]): void {
    if (typeof localStorage === 'undefined') return;
    const userId = this.currentUserId;
    if (!userId) return;
    const merged = new Set([...this.grantedPermissions, ...permissions]);
    this.writeStoredGrants(userId, [...merged]);
  }

  /**
   * Replaces the cache with exactly `permissions` for the current user (used to
   * reconcile the cache with the authoritative set the server returns on a
   * data-exchange grant). No-ops when signed out.
   */
  public static setGrantedPermissions(permissions: string[]): void {
    if (typeof localStorage === 'undefined') return;
    const userId = this.currentUserId;
    if (!userId) return;
    this.writeStoredGrants(userId, [...new Set(permissions)]);
  }

  /** Drops a single permission from the cache — used to honor a server 401/403. */
  public static removeGrantedPermission(permission: string): void {
    if (typeof localStorage === 'undefined') return;
    const userId = this.currentUserId;
    if (!userId) return;
    const next = this.grantedPermissions.filter((entry) => entry !== permission);
    this.writeStoredGrants(userId, next);
  }

  public static clearGrantedPermissions(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.grantedPermissionsKey);
  }

  /**
   * The id of the user who initiated the pending data-exchange redirect.
   *
   * The just-in-time data-exchange flow is fire-and-forget: it full-page
   * redirects to a hosted consent page and the grant comes back on the return
   * URL. If a different user signs in on another tab before the redirect
   * returns, the grant would otherwise be saved under whoever is signed in when
   * the callback loads. Recording the initiating user here lets the callback
   * verify the same user is still signed in before honoring the grant.
   */
  private static readonly dataExchangeInitiatorKey = 'youversion-platform:data-exchange-initiator';

  /**
   * Records the current user as the initiator of a data-exchange redirect.
   * No-ops when signed out — the just-in-time flow only starts authenticated
   * (minting the token requires an access token), so a missing initiator on
   * return is treated as untrusted by {@link dataExchangeInitiator}'s consumer.
   */
  public static saveDataExchangeInitiator(): void {
    if (typeof localStorage === 'undefined') return;
    const userId = this.currentUserId;
    if (!userId) return;
    localStorage.setItem(this.dataExchangeInitiatorKey, userId);
  }

  /** The initiating user's id for the pending data exchange, or `null`. */
  public static get dataExchangeInitiator(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.dataExchangeInitiatorKey);
  }

  public static clearDataExchangeInitiator(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.dataExchangeInitiatorKey);
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

  /**
   * The integrator's own pitch line shown in the sign-in dialog. Optional; not
   * persisted (it is supplied by configuration on each app load).
   */
  static get signInPromptMessage(): string | undefined {
    return this._signInPromptMessage;
  }

  static set signInPromptMessage(value: string | undefined) {
    this._signInPromptMessage = value;
  }

  /**
   * The integrator's display name used in the sign-in dialog copy (e.g.
   * "{appName} wants to connect to your YouVersion Bible App account"). Optional;
   * not persisted (it is supplied by configuration on each app load).
   */
  static get appName(): string | undefined {
    return this._appName;
  }

  static set appName(value: string | undefined) {
    this._appName = value;
  }
}
