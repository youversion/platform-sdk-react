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
const repoRoot = resolve(uiRoot, '../..');
const tsupPath = join(uiRoot, 'tsup.config.ts');
const barrelPath = join(uiRoot, 'src/components/index.ts');
const uiIndexPath = join(uiRoot, 'src/index.ts');
const coreIndexPath = join(repoRoot, 'packages/core/src/index.ts');

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

function namedValueExports(source) {
  const names = new Set();
  for (const block of source.matchAll(/export\s*\{([\s\S]*?)\}\s*from/g)) {
    for (const part of block[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith('type ')) {
        continue;
      }
      const name = trimmed.split(/\s+as\s+/)[0]?.trim();
      if (name) {
        names.add(name);
      }
    }
  }
  return names;
}

const required = [
  'src/index.ts',
  'src/components/YouVersionProvider.tsx',
  ...barrelModules().map(resolveBarrelEntry),
];
const actual = tsupEntries();
const missing = required.filter((entry) => !actual.includes(entry));
const extra = actual.filter((entry) => !required.includes(entry));
const coreValues = namedValueExports(readFileSync(coreIndexPath, 'utf8'));
const uiValues = namedValueExports(readFileSync(uiIndexPath, 'utf8'));
const missingCoreValues = [...coreValues].filter((name) => !uiValues.has(name)).sort();

if (missing.length > 0 || extra.length > 0 || missingCoreValues.length > 0) {
  if (missing.length > 0) {
    console.error('tsup entry list is missing public modules:\n  ' + missing.join('\n  '));
  }
  if (extra.length > 0) {
    console.error('tsup entry list has modules the public barrel does not export:\n  ' + extra.join('\n  '));
  }
  if (missingCoreValues.length > 0) {
    console.error(
      'UI root is missing core runtime re-exports:\n  ' + missingCoreValues.join('\n  '),
    );
  }
  process.exit(1);
}

console.log(
  `Public tsup entries match the barrel (${actual.length} entries); core runtime re-exports match (${coreValues.size})`,
);
