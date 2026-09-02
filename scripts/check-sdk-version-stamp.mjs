#!/usr/bin/env node
// Fail-hard publish guard for the X-YVP-Sdk version header.
//
// Published builds must report the real version (`ReactSDK=2.2.0`), never the
// `-dev` suffix used for internal YouVersion dev traffic. `src/version.ts`
// compiles to `isPublishBuild ? version : `${version}-dev``; a stamped build
// folds `isPublishBuild` to `true`, a dev build to `false`. The stamp lives in
// `@youversion/platform-core`. UI and hooks import that package at runtime.
//
// This runs from each package's `prepublishOnly`, so `npm publish` aborts if the
// artifact would tag traffic as `-dev`. (Grepping for `-dev` directly would
// false-positive: the ternary's dead branch keeps the suffix in every build.)
//
// Usage: node scripts/check-sdk-version-stamp.mjs core

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGE_DIRS = {
  core: 'packages/core',
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

// A stamped (publish) build folds `isPublishBuild` to `true`; a dev build folds
// it to `false`. We assert the *positive* stamp is present rather than merely
// checking the dev marker is absent: if the build tooling ever inlines or
// minifies the constant away (renaming/removing `isPublishBuild`), neither
// literal survives, and an absence-only check would silently pass a `-dev`
// build. Requiring the positive stamp fails *closed* in that case — a loud,
// fixable publish abort instead of shipping dev-tagged telemetry to partners.
const DEV_MARKER = /isPublishBuild\s*=\s*false/;
const STAMP_MARKER = /isPublishBuild\s*=\s*true/;

const unstamped = [];
const unverifiable = [];
let sawVersionCode = false;

for (const file of bundleFiles) {
  const content = readFileSync(join(distDir, file), 'utf8');
  // Split entries re-export `SDK_VERSION` without the stamp assignment.
  // Only files that emit `isPublishBuild` are the version implementation.
  if (!content.includes('isPublishBuild')) continue;
  sawVersionCode = true;
  if (DEV_MARKER.test(content)) {
    unstamped.push(file);
  } else if (!STAMP_MARKER.test(content)) {
    unverifiable.push(file);
  }
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

if (unverifiable.length > 0) {
  console.error(
    `check-sdk-version-stamp: could not confirm the X-YVP-Sdk stamp in ${packageDir}/dist.\n` +
      `Affected files: ${unverifiable.join(', ')}\n` +
      `Version code is present but neither the stamped nor dev marker was found — the build ` +
      `output shape likely changed (e.g. minify/inline was enabled). Update this guard before publishing.`,
  );
  process.exit(1);
}

console.log(`check-sdk-version-stamp: ${packageDir} X-YVP-Sdk header is stamped for release.`);
