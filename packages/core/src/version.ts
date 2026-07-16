import pkg from '../package.json' with { type: 'json' };

export const SDK_NAME = 'ReactSDK';

export const SDK_VERSION_HEADER_NAME = 'X-YVP-Sdk';

/**
 * `true` only in builds produced for publishing (see `tsup.config.ts`, which
 * replaces `process.env.YVP_PUBLISH_BUILD` at build time). Dev, source, and
 * test builds leave it falsy so their traffic is tagged with a `-dev` suffix.
 *
 * This lets platform telemetry separate internal YouVersion dev-time traffic
 * (`ReactSDK=2.2.0-dev`) from published partner traffic (`ReactSDK=2.2.0`).
 */
const isPublishBuild = process.env.YVP_PUBLISH_BUILD === 'true';

export const SDK_VERSION = isPublishBuild ? pkg.version : `${pkg.version}-dev`;

export function buildSdkVersionHeaderValue(): string {
  return `${SDK_NAME}=${SDK_VERSION}`;
}
