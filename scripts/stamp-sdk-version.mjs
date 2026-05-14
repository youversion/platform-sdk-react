#!/usr/bin/env node
// Writes the published version from packages/core/package.json into
// packages/core/src/version.ts so the X-YVP-Sdk header carries an exact
// version on every API call. Invoked by the `release` script in CI, just
// before the build that gets published to npm — local builds never run this,
// so SDK_VERSION stays at "Dev" for non-release artifacts.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const corePackageJsonPath = resolve(repoRoot, 'packages/core/package.json');
const versionFilePath = resolve(repoRoot, 'packages/core/src/version.ts');

const corePkg = JSON.parse(readFileSync(corePackageJsonPath, 'utf8'));
const version = corePkg.version;

if (!version || typeof version !== 'string') {
  console.error('stamp-sdk-version: could not read version from packages/core/package.json');
  process.exit(1);
}

const source = readFileSync(versionFilePath, 'utf8');
const stamped = source.replace(
  /export const SDK_VERSION = '[^']*';/,
  `export const SDK_VERSION = '${version}';`,
);

if (stamped === source) {
  console.error(
    `stamp-sdk-version: failed to update SDK_VERSION in ${versionFilePath}. ` +
      'Has the export signature changed?',
  );
  process.exit(1);
}

writeFileSync(versionFilePath, stamped);
console.log(`stamp-sdk-version: SDK_VERSION = '${version}'`);
