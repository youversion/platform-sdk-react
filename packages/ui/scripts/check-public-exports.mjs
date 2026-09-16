#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreRoot = resolve(uiRoot, '../core');
const require = createRequire(import.meta.url);

const coreEsm = await import(pathToFileURL(join(coreRoot, 'dist/index.js')).href);
const uiEsm = await import(pathToFileURL(join(uiRoot, 'dist/index.js')).href);
const uiCjs = require(join(uiRoot, 'dist/index.cjs'));

const coreNames = Object.keys(coreEsm).sort();
const uiEsmNames = Object.keys(uiEsm).sort();
const uiCjsNames = Object.keys(uiCjs).sort();
const missingCoreNames = coreNames.filter((name) => !uiEsmNames.includes(name));
const esmOnly = uiEsmNames.filter((name) => !uiCjsNames.includes(name));
const cjsOnly = uiCjsNames.filter((name) => !uiEsmNames.includes(name));

if (missingCoreNames.length > 0 || esmOnly.length > 0 || cjsOnly.length > 0) {
  if (missingCoreNames.length > 0) {
    console.error('UI root is missing core runtime exports:\n  ' + missingCoreNames.join('\n  '));
  }
  if (esmOnly.length > 0) {
    console.error('UI runtime exports available only in ESM:\n  ' + esmOnly.join('\n  '));
  }
  if (cjsOnly.length > 0) {
    console.error('UI runtime exports available only in CommonJS:\n  ' + cjsOnly.join('\n  '));
  }
  process.exit(1);
}

console.log(
  `UI runtime exports match across ESM and CommonJS (${uiEsmNames.length}); all core runtime exports are preserved (${coreNames.length})`,
);
