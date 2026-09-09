import { describe, expect, it } from 'vitest';
import { getFontStylesheetUrl } from './getFontStylesheetUrl';

describe('getFontStylesheetUrl', () => {
  it('builds the Fonts API stylesheet URL for a font id and app key', () => {
    expect(getFontStylesheetUrl({ appKey: 'test-app-key' })).toBe(
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=test-app-key',
    );

    expect(getFontStylesheetUrl({ fontId: 7, appKey: 'test-app-key' })).toBe(
      'https://api.youversion.com/v1/fonts/7/stylesheet?app_key=test-app-key',
    );

    expect(
      getFontStylesheetUrl({
        fontId: 1,
        appKey: 'test-app-key',
        apiHost: 'https://api-staging.youversion.com/',
      }),
    ).toBe('https://api-staging.youversion.com/v1/fonts/1/stylesheet?app_key=test-app-key');

    expect(getFontStylesheetUrl({ appKey: 'key encode/+chars' })).toBe(
      'https://api.youversion.com/v1/fonts/1/stylesheet?app_key=key%20encode%2F%2Bchars',
    );
  });
});
