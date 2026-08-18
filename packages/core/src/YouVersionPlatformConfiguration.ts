import { YouVersionUserInfoJSONSchema, type YouVersionUserInfoJSON } from './schemas/user-info';
import { getLocalStorage, removeStorageItem, setStorageItem } from './web-storage';

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
  private static _permittedVersionIds: number[] | undefined = undefined;
  private static _excludedVersionIds: number[] | undefined = undefined;
  private static _permittedLanguageTags: string[] | undefined = undefined;

  private static getOrSetInstallationId(): string {
    const storage = getLocalStorage();
    // An id that can't be persisted isn't an installation id — it would be a
    // fresh value per process, shared by every user of an SSR server. Callers
    // treat '' as absent and omit the header.
    if (!storage) {
      return '';
    }

    const existingId = storage.getItem('x-yvp-installation-id');
    if (existingId) {
      return existingId;
    }

    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `yvp-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 10)}`;
    // A store that rejects the write (Safari private mode) leaves us just as
    // unable to persist as no store at all.
    return setStorageItem(storage, 'x-yvp-installation-id', newId) ? newId : '';
  }

  /**
   * Persists the session tokens; a `null` value clears the corresponding key.
   *
   * @returns `true` when every value it was asked to persist actually landed.
   *   The session lives entirely in storage — the {@link accessToken},
   *   {@link refreshToken}, and {@link tokenExpiryDate} getters read straight
   *   back out of it — so a caller reporting a successful sign-in must not do
   *   so on `false`. Clearing always reports `true`: removal is best-effort,
   *   and every reader tolerates a value that outlived its removal.
   */
  public static saveAuthData(
    accessToken: string | null,
    refreshToken: string | null,
    expiryDate: Date | null,
  ): boolean {
    const storage = getLocalStorage();
    let persisted = true;

    if (accessToken !== null) {
      persisted = setStorageItem(storage, 'accessToken', accessToken) && persisted;
    } else {
      removeStorageItem(storage, 'accessToken');
    }

    if (refreshToken !== null) {
      persisted = setStorageItem(storage, 'refreshToken', refreshToken) && persisted;
    } else {
      removeStorageItem(storage, 'refreshToken');
    }

    if (expiryDate !== null) {
      persisted = setStorageItem(storage, 'expiryDate', expiryDate.toISOString()) && persisted;
    } else {
      removeStorageItem(storage, 'expiryDate');
    }

    return persisted;
  }

  /**
   * Persists the decoded user profile derived from the ID token at sign-in.
   * Pass `null` to remove any stored profile.
   *
   * @returns `true` when the profile was actually persisted (or removed) — see
   *   {@link saveAuthData} for why a caller must not ignore a `false`.
   */
  public static saveUserInfo(userInfo: YouVersionUserInfoJSON | null): boolean {
    const storage = getLocalStorage();

    if (userInfo === null) {
      removeStorageItem(storage, 'userInfo');
      return true;
    }

    return setStorageItem(storage, 'userInfo', JSON.stringify(userInfo));
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
    const raw = getLocalStorage()?.getItem(this.grantedPermissionsKey);
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
    setStorageItem(
      getLocalStorage(),
      this.grantedPermissionsKey,
      JSON.stringify({ userId, permissions }),
    );
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
    const userId = this.currentUserId;
    if (!userId) return;
    const merged = new Set([...this.grantedPermissions, ...permissions]);
    this.writeStoredGrants(userId, [...merged]);
  }

  /** Drops a single permission from the cache — used to honor a server 401/403. */
  public static removeGrantedPermission(permission: string): void {
    const userId = this.currentUserId;
    if (!userId) return;
    const next = this.grantedPermissions.filter((entry) => entry !== permission);
    this.writeStoredGrants(userId, next);
  }

  public static clearGrantedPermissions(): void {
    removeStorageItem(getLocalStorage(), this.grantedPermissionsKey);
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
    const userId = this.currentUserId;
    if (!userId) return;
    setStorageItem(getLocalStorage(), this.dataExchangeInitiatorKey, userId);
  }

  /** The initiating user's id for the pending data exchange, or `null`. */
  public static get dataExchangeInitiator(): string | null {
    return getLocalStorage()?.getItem(this.dataExchangeInitiatorKey) ?? null;
  }

  public static clearDataExchangeInitiator(): void {
    removeStorageItem(getLocalStorage(), this.dataExchangeInitiatorKey);
  }

  /** Optimistic check against the permission cache. Server 401/403 still wins. */
  public static hasPermission(permission: string): boolean {
    return this.grantedPermissions.includes(permission);
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

  /**
   * Allowlist of Bible version ids this app may use. Unset = no restriction.
   * An empty array permits nothing. See YPE-4657.
   */
  static get permittedVersionIds(): number[] | undefined {
    return this._permittedVersionIds;
  }

  static set permittedVersionIds(value: number[] | undefined) {
    this._permittedVersionIds = value;
  }

  /**
   * Denylist of Bible version ids this app may not use. Unset or empty =
   * exclude nothing. Exclusion wins over `permittedVersionIds`.
   */
  static get excludedVersionIds(): number[] | undefined {
    return this._excludedVersionIds;
  }

  static set excludedVersionIds(value: number[] | undefined) {
    this._excludedVersionIds = value;
  }

  /**
   * Allowlist of BCP 47 language tags (`en`, `zh-Hans`). Unset = no
   * restriction. An empty array permits nothing.
   */
  static get permittedLanguageTags(): string[] | undefined {
    return this._permittedLanguageTags;
  }

  static set permittedLanguageTags(value: string[] | undefined) {
    this._permittedLanguageTags = value;
  }
}
