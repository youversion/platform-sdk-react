#!/usr/bin/env node
// Fail-hard publish guard for the X-YVP-Sdk version header.
//
// Published builds must report the real version (`ReactSDK=2.2.0`), never the
// `-dev` suffix used for internal YouVersion dev traffic. `src/version.ts`
// compiles to `isPublishBuild ? version : `${version}-dev``; a stamped build
// folds `isPublishBuild` to `true`, a dev build to `false`. `@youversion/
// platform-react-ui` bundles core, so the same constant appears in its output.
//
// This runs from each package's `prepublishOnly`, so `npm publish` aborts if the
// artifact would tag traffic as `-dev`. (Grepping for `-dev` directly would
// false-positive: the ternary's dead branch keeps the suffix in every build.)
//
// Usage: node scripts/check-sdk-version-stamp.mjs <core|ui>

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGE_DIRS = {
  core: 'packages/core',
  ui: 'packages/ui',
};

const pkg = process.argv[2];
const packageDir = PACKAGE_DIRS[pkg];
if (!packageDir) {
  console.error(
    `check-sdk-version-stamp: unknown package "${pkg}". Expected one of: ${Object.keys(
      PACKAGE_DIRS,
    ).join(', ')}`,
  );
  process.exit(1);
}

const distDir = join(repoRoot, packageDir, 'dist');

let bundleFiles;
try {
  bundleFiles = readdirSync(distDir).filter((f) => /\.(js|cjs)$/.test(f));
} catch {
  console.error(`check-sdk-version-stamp: no dist found at ${distDir}. Build before publishing.`);
  process.exit(1);
}

const DEV_MARKER = /isPublishBuild\s*=\s*false/;

const unstamped = [];
let sawVersionCode = false;

for (const file of bundleFiles) {
  const content = readFileSync(join(distDir, file), 'utf8');
  if (content.includes('SDK_VERSION')) sawVersionCode = true;
  if (DEV_MARKER.test(content)) unstamped.push(file);
}

if (!sawVersionCode) {
  console.error(
    `check-sdk-version-stamp: no SDK version code found in ${packageDir}/dist. ` +
      `The guard could not verify the stamp; investigate before publishing.`,
  );
  process.exit(1);
}

if (unstamped.length > 0) {
  console.error(
    `check-sdk-version-stamp: ${packageDir} would publish an unstamped (-dev) X-YVP-Sdk header.\n` +
      `Affected files: ${unstamped.join(', ')}\n` +
      `Publish via a build with YVP_PUBLISH_BUILD=true (core's prepublishOnly does this).`,
  );
  process.exit(1);
}

console.log(`check-sdk-version-stamp: ${packageDir} X-YVP-Sdk header is stamped for release.`);
