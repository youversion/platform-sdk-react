import {
  StoredGrantsSchema,
  StoredOAuthSessionSchema,
  type StoredOAuthSession,
} from './schemas/auth';
import { YouVersionUserInfoJSONSchema, type YouVersionUserInfoJSON } from './schemas/user-info';
import { parsePermissionList } from './permissions';
import type { AuthenticationScopes } from './types';
import { versionFilterState } from './version-filter-state';
import { getLocalStorage, removeStorageItem, setStorageItem } from './web-storage';
import { AUTH_STATE_KEY } from './auth-storage-keys';

type LegacyAuthSession = {
  userId: string | null;
  accessToken: string;
  refreshToken: string | null;
};

function parseStoredUserInfo(raw: string | null | undefined): YouVersionUserInfoJSON | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = YouVersionUserInfoJSONSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function invalidateAuthorization(storage: Storage | null, state: string | null | undefined) {
  if (state && storage?.getItem(AUTH_STATE_KEY) === state) {
    removeStorageItem(storage, AUTH_STATE_KEY);
  }
}

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

    const newId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
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
    oauthSession?: Pick<StoredOAuthSession, 'scope' | 'userId'>,
  ): boolean {
    const storage = getLocalStorage();
    const previousState =
      accessToken !== null && oauthSession && oauthSession.userId !== this.currentUserId
        ? storage?.getItem(AUTH_STATE_KEY)
        : null;
    let persisted = true;

    if (accessToken !== null) {
      if (oauthSession) {
        const value = JSON.stringify({ ...oauthSession, accessToken, refreshToken });
        persisted = setStorageItem(storage, 'youversion-auth-scope', value) && persisted;
      } else {
        removeStorageItem(storage, 'youversion-auth-scope');
      }
      persisted = setStorageItem(storage, 'accessToken', accessToken) && persisted;
    } else {
      removeStorageItem(storage, 'accessToken');
      removeStorageItem(storage, 'youversion-auth-scope');
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

    if (persisted) invalidateAuthorization(storage, previousState);
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
    const previousId = parseStoredUserInfo(storage?.getItem('userInfo'))?.id ?? null;
    const previousState =
      previousId !== (userInfo?.id ?? null) ? storage?.getItem(AUTH_STATE_KEY) : null;

    if (userInfo === null) {
      removeStorageItem(storage, 'userInfo');
      if (!storage?.getItem('userInfo')) invalidateAuthorization(storage, previousState);
      return true;
    }

    const persisted = setStorageItem(storage, 'userInfo', JSON.stringify(userInfo));
    if (persisted) invalidateAuthorization(storage, previousState);
    return persisted;
  }

  public static clearAuthTokens(): void {
    this.saveAuthData(null, null, null);
    this.saveUserInfo(null);
    this.clearGrantedPermissions();
    this.clearDataExchangeInitiator();
    removeStorageItem(getLocalStorage(), AUTH_STATE_KEY);
  }

  /** Returns an account's current access token, verifying the scope or the unchanged legacy session. */
  public static getOAuthAccessToken(
    userId: string | null,
    scope?: AuthenticationScopes,
    legacySession?: LegacyAuthSession,
  ): string | null {
    const session = this.readOAuthSession();
    if (session) {
      return session.userId === userId &&
        (scope === undefined || parsePermissionList(session.scope).includes(scope))
        ? session.accessToken
        : null;
    }
    if (session === null || scope !== undefined || legacySession?.userId !== userId) return null;
    return this.currentUserId === userId &&
      this.accessToken === legacySession.accessToken &&
      this.refreshToken === legacySession.refreshToken
      ? legacySession.accessToken
      : null;
  }

  /**
   * Whether a persisted OAuth binding is invalid or disagrees with the stored credentials or profile.
   * An absent legacy binding does not block profile display. Managed account requests still need
   * a validated token from `getOAuthAccessToken`.
   */
  public static get hasMismatchedOAuthSession(): boolean {
    return this.readOAuthSession() === null;
  }

  /** @internal Reads the OAuth session for token rotation, or `null` for a mismatched record. */
  public static readOAuthSession(): StoredOAuthSession | null | undefined {
    const storage = getLocalStorage();
    const raw = storage?.getItem('youversion-auth-scope');
    if (raw === null || raw === undefined) return undefined;
    try {
      const session = StoredOAuthSessionSchema.parse(JSON.parse(raw));
      // A different tab may be partway through replacing the token or profile.
      return session.accessToken === storage?.getItem('accessToken') &&
        session.refreshToken === (storage?.getItem('refreshToken') ?? null) &&
        session.userId === this.currentUserId
        ? session
        : null;
    } catch {
      return null;
    }
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
      const parsed = StoredGrantsSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
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
    return parseStoredUserInfo(getLocalStorage()?.getItem('userInfo'));
  }

  /** Whether a storage event records the loss or replacement of a signed-in profile. */
  public static didStoredAccountChange(
    event: Pick<StorageEvent, 'key' | 'oldValue' | 'newValue'>,
  ): boolean {
    if (event.key === null) return true;
    if (event.key !== 'userInfo') return false;
    const previousUserId = parseStoredUserInfo(event.oldValue)?.id;
    return !!previousUserId && previousUserId !== parseStoredUserInfo(event.newValue)?.id;
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
    return versionFilterState.permittedVersionIds;
  }

  static set permittedVersionIds(value: number[] | undefined) {
    versionFilterState.permittedVersionIds = value;
  }

  /**
   * Denylist of Bible version ids this app may not use. Unset or empty =
   * exclude nothing. Exclusion wins over `permittedVersionIds`.
   */
  static get excludedVersionIds(): number[] | undefined {
    return versionFilterState.excludedVersionIds;
  }

  static set excludedVersionIds(value: number[] | undefined) {
    versionFilterState.excludedVersionIds = value;
  }

  /**
   * Allowlist of BCP 47 language tags (`en`, `zh-Hans`). Unset = no
   * restriction. An empty array permits nothing.
   */
  static get permittedLanguageTags(): string[] | undefined {
    return versionFilterState.permittedLanguageTags;
  }

  static set permittedLanguageTags(value: string[] | undefined) {
    versionFilterState.permittedLanguageTags = value;
  }
}
