import type { YouVersionUserInfo } from './YouVersionUserInfo';

export class YouVersionPlatformConfiguration {
  private static _appKey: string | null = null;
  private static _installationId: string | null = null;
  private static _accessToken: string | null = null;
  private static _apiHost: string = 'api.youversion.com';
  private static _isPreviewMode: boolean = false;
  private static _previewUserInfo: YouVersionUserInfo | null = null;

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
    this._accessToken = token;
  }

  static get accessToken(): string | null {
    return this._accessToken;
  }

  static get apiHost(): string {
    return this._apiHost;
  }

  static set apiHost(value: string) {
    this._apiHost = value;
  }

  static get isPreviewMode(): boolean {
    return this._isPreviewMode;
  }

  static set isPreviewMode(value: boolean) {
    this._isPreviewMode = value;
  }

  static get previewUserInfo(): YouVersionUserInfo | null {
    return this._previewUserInfo;
  }

  static set previewUserInfo(value: YouVersionUserInfo | null) {
    this._previewUserInfo = value;
  }
}
