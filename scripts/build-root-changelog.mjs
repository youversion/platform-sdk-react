#!/usr/bin/env node
// Build the repo-root CHANGELOG.md by merging the per-package changelogs Changesets writes.
//
// Swift and Kotlin each ship a root CHANGELOG.md; this repo had only per-package files, so
// there was no single place to see what shipped in a release (YPE-4190).
//
// The three packages are a `fixed` group in .changeset/config.json, so they always share a
// version number and a changeset touching several of them writes the *same* entry into each
// of their changelogs. Copying all three verbatim would therefore triple most entries. This
// merges by version, shows each entry once, and notes which packages it affected.
//
// `Updated dependencies` blocks are dropped: they are the fixed group's internal bookkeeping,
// not something a consumer reading release notes needs.
//
// Run via `pnpm build:root-changelog`; wired into `version-packages` so the Version Packages
// PR carries an up-to-date root changelog.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, 'packages');

/** `## 2.12.1` ... up to the next `## ` */
function versionSections(markdown) {
  const out = [];
  const lines = markdown.split('\n');
  let current = null;
  for (const line of lines) {
    const m = line.match(/^## (\d+\.\d+\.\d+.*)$/);
    if (m) {
      if (current) out.push(current);
      current = { version: m[1].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) out.push(current);
  return out;
}

/**
 * Split a version body into `{ kind, entries }`, where kind is Major/Minor/Patch and each
 * entry keeps its continuation lines (Changesets indents them by two spaces).
 */
function parseEntries(bodyLines) {
  const groups = [];
  let kind = null;
  let entry = null;
  const push = () => {
    if (entry && kind) groups.push({ kind, text: entry.join('\n').trimEnd() });
    entry = null;
  };
  for (const line of bodyLines) {
    const heading = line.match(/^### (.+?) Changes\s*$/);
    if (heading) {
      push();
      kind = heading[1];
      continue;
    }
    if (/^- /.test(line)) {
      push();
      entry = [line];
      continue;
    }
    if (entry) entry.push(line);
  }
  push();
  // The fixed group's own bookkeeping, not release notes.
  return groups.filter((g) => !/^- Updated dependencies/.test(g.text));
}

const packages = readdirSync(PACKAGES).filter((d) => existsSync(join(PACKAGES, d, 'CHANGELOG.md')));

/** version -> kind -> entryText -> Set(packageName) */
const byVersion = new Map();
const order = [];

for (const dir of packages) {
  const pkgName = JSON.parse(readFileSync(join(PACKAGES, dir, 'package.json'), 'utf8')).name;
  const md = readFileSync(join(PACKAGES, dir, 'CHANGELOG.md'), 'utf8');
  for (const { version, body } of versionSections(md)) {
    if (!byVersion.has(version)) {
      byVersion.set(version, new Map());
      order.push(version);
    }
    const kinds = byVersion.get(version);
    for (const { kind, text } of parseEntries(body)) {
      if (!kinds.has(kind)) kinds.set(kind, new Map());
      const entries = kinds.get(kind);
      if (!entries.has(text)) entries.set(text, new Set());
      entries.get(text).add(pkgName);
    }
  }
}

// Newest first. Changesets already writes each file newest-first, and the fixed group means
// every package sees the same versions, so first-seen order is release order.
const KIND_ORDER = ['Major', 'Minor', 'Patch'];
const out = [
  '# Changelog',
  '',
  'All notable changes to the YouVersion Platform React SDK.',
  '',
  '`@youversion/platform-core`, `@youversion/platform-react-hooks` and',
  '`@youversion/platform-react-ui` are a `fixed` group in `.changeset/config.json`, so they',
  'share a version number and release together. Each entry below notes which packages it',
  'affected.',
  '',
  'Generated from the per-package changelogs by `scripts/build-root-changelog.mjs` — edit those,',
  'or the changeset, rather than this file.',
  '',
];

for (const version of order) {
  out.push(`## ${version}`, '');
  const kinds = byVersion.get(version);
  for (const kind of KIND_ORDER) {
    const entries = kinds.get(kind);
    if (!entries || entries.size === 0) continue;
    out.push(`### ${kind} Changes`, '');
    for (const [text, pkgs] of entries) {
      const scope = pkgs.size === packages.length ? 'all packages' : [...pkgs].sort().join(', ');
      out.push(text.replace(/^- /, `- _(${scope})_ `), '');
    }
  }
}

writeFileSync(
  join(ROOT, 'CHANGELOG.md'),
  out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd() + '\n',
);
console.log(`Wrote CHANGELOG.md — ${order.length} versions from ${packages.length} packages.`);
