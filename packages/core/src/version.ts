import pkg from '../package.json' with { type: 'json' };

export const SDK_VERSION = pkg.version;

export const SDK_NAME = 'ReactSDK';

export const SDK_VERSION_HEADER_NAME = 'X-YVP-Sdk';

export function buildSdkVersionHeaderValue(): string {
  return `${SDK_NAME}=${SDK_VERSION}`;
}
