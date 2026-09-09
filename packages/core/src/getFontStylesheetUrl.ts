export type GetFontStylesheetUrlOptions = {
  fontId?: number;
  appKey: string;
  apiHost?: string;
};

/** Default `fontId` is 1 (Untitled Serif). See ADR-0004. */
export function getFontStylesheetUrl({
  fontId = 1,
  appKey,
  apiHost = 'https://api.youversion.com',
}: GetFontStylesheetUrlOptions): string {
  const host = apiHost.replace(/\/+$/, '');
  return `${host}/v1/fonts/${fontId}/stylesheet?app_key=${encodeURIComponent(appKey)}`;
}
