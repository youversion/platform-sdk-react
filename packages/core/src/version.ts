// SDK_VERSION is injected by tsup during build using the version from package.json.
// It contains the exact published version on release builds. In development/test,
// it falls back to "Dev" if not defined by the bundler.
declare const SDK_VERSION: string;

const resolvedSdkVersion = typeof SDK_VERSION !== 'undefined' ? SDK_VERSION : 'Dev';

export const SDK_NAME = 'ReactSDK';

export const SDK_VERSION_HEADER_NAME = 'X-YVP-Sdk';

export function buildSdkVersionHeaderValue(): string {
  return `${SDK_NAME}=${resolvedSdkVersion}`;
}
