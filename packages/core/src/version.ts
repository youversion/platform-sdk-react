// SDK_VERSION is replaced by the release workflow with the precise published
// version before publishing to npm. Local/non-release builds keep "Dev" so the
// data lake can distinguish them from real release traffic.
export const SDK_VERSION = 'Dev';

export const SDK_NAME = 'ReactSDK';

export const SDK_VERSION_HEADER_NAME = 'X-YVP-Sdk';

export function buildSdkVersionHeaderValue(): string {
  return `${SDK_NAME}=${SDK_VERSION}`;
}
