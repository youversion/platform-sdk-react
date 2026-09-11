#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resourceSourcePath = join(repoRoot, 'packages/core/src/bible-display-resources.ts');
const cssMajorPath = join(repoRoot, 'packages/ui/CDN_CSS_MAJOR_VERSION');

const cssMajor = readFileSync(cssMajorPath, 'utf8').trim();
if (!/^\d+$/.test(cssMajor)) {
  console.error(
    `check-cdn-css-major: ${cssMajorPath} must contain one non-negative integer; got ${JSON.stringify(cssMajor)}.`,
  );
  process.exit(1);
}

const resourceSource = readFileSync(resourceSourcePath, 'utf8');
const urlMatch = resourceSource.match(
  /BIBLE_CSS_STYLESHEET_URL\s*=\s*['"]https:\/\/cdn\.youversion\.com\/platform\/(\d+)\/bible\.css['"]/,
);
if (!urlMatch) {
  console.error(
    `check-cdn-css-major: could not parse BIBLE_CSS_STYLESHEET_URL in ${resourceSourcePath}.`,
  );
  process.exit(1);
}

const urlMajor = urlMatch[1];
if (urlMajor !== cssMajor) {
  console.error(
    `check-cdn-css-major: core returns CSS major ${urlMajor}, but packages/ui/CDN_CSS_MAJOR_VERSION is ${cssMajor}. Update both in the same change.`,
  );
  process.exit(1);
}

console.log(`check-cdn-css-major: core and CDN publisher use CSS major ${cssMajor}.`);
