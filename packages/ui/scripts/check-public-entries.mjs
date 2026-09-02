#!/usr/bin/env node
/**
 * Fail if the UI tsup entry list drifts from the public component barrel.
 *
 * Four entries leave Bible UI on the root graph. Every runtime module
 * re-exported by src/components/index.ts, plus YouVersionProvider and
 * src/index.ts, must be a named tsup entry.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsupPath = join(uiRoot, 'tsup.config.ts');
const barrelPath = join(uiRoot, 'src/components/index.ts');

function parseQuotedStrings(block) {
  return [...block.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function tsupEntries() {
  const source = readFileSync(tsupPath, 'utf8');
  const block = source.match(/entry:\s*\[([\s\S]*?)\]/);
  if (!block) {
    throw new Error('tsup.config.ts: missing entry array');
  }
  return parseQuotedStrings(block[1]);
}

function barrelModules() {
  const source = readFileSync(barrelPath, 'utf8');
  return [...source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)].map((match) => match[1]);
}

function resolveBarrelEntry(specifier) {
  const rel = specifier.replace(/^\.\//, '');
  for (const ext of ['.tsx', '.ts']) {
    const entry = `src/components/${rel}${ext}`;
    if (existsSync(join(uiRoot, entry))) {
      return entry;
    }
  }
  throw new Error(`components/index.ts exports ${specifier} but no src file exists`);
}

const required = [
  'src/index.ts',
  'src/components/YouVersionProvider.tsx',
  ...barrelModules().map(resolveBarrelEntry),
];
const actual = tsupEntries();
const missing = required.filter((entry) => !actual.includes(entry));
const extra = actual.filter((entry) => !required.includes(entry));

if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) {
    console.error('tsup entry list is missing public modules:\n  ' + missing.join('\n  '));
  }
  if (extra.length > 0) {
    console.error('tsup entry list has modules the public barrel does not export:\n  ' + extra.join('\n  '));
  }
  process.exit(1);
}

console.log(`Public tsup entries match the barrel (${actual.length} entries)`);
