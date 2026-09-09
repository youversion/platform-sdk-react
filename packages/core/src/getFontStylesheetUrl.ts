export type GetFontStylesheetUrlOptions = {
  fontId?: number;
  appKey: string;
  apiHost?: string;
};

/** Default `fontId` is 1 (Untitled Serif). `apiHost` is hostname-only, like `ApiClient`. See ADR-0004. */
export function getFontStylesheetUrl({
  fontId = 1,
  appKey,
  apiHost = 'api.youversion.com',
}: GetFontStylesheetUrlOptions): string {
  const trimmed = apiHost.replace(/\/+$/, '');
  const host = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  return `${host}/v1/fonts/${fontId}/stylesheet?app_key=${encodeURIComponent(appKey)}`;
}
