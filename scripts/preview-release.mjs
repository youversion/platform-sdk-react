#!/usr/bin/env node
// Compute the pending release for a PR and report whether this PR is the one
// introducing a breaking change.
//
// The Swift SDK's script of the same name calls `@semantic-release/commit-analyzer`,
// because there commit footers drive the version. This repo does not work that way:
// the bump level is declared in `.changeset/*.md` frontmatter and Changesets computes
// the version. See docs/release-hardening-decisions.md (Decision 1), which records
// that ruling.
//
// Two questions, deliberately kept separate:
//
//   is_major         - would the pending release be a major? (from `changeset status`,
//                      which is authoritative and accounts for the `fixed` group)
//   introduced_major - did *this PR* add a changeset declaring `major`? Only this gates.
//                      Without it, a major already pending on main would block every
//                      unrelated PR until the release went out.
//
// Output (stdout): one line of JSON:
//   { current, next, release_type, is_major, introduced_major, packages, added_changesets }
//
// Usage:
//   node scripts/preview-release.mjs --base <sha> [--head <sha>]
import { execFileSync } from 'node:child_process';
import parseChangeset from '@changesets/parse';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i]?.startsWith('--')) out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.base) {
  console.error('usage: preview-release.mjs --base <sha> [--head <sha>]');
  process.exit(2);
}
const head = args.head ?? 'HEAD';

const git = (...a) =>
  execFileSync('git', a, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

/**
 * `changeset status` writes its JSON relative to the repo root, not the cwd, and prints
 * a `/dev/tty` warning on non-interactive runners. Write to a temp dir inside the repo
 * and read it back rather than parsing stdout.
 */
function changesetStatus() {
  const dir = mkdtempSync(join(REPO_ROOT, '.changeset-status-'));
  const rel = join(relative(REPO_ROOT, dir), 'status.json');
  try {
    try {
      execFileSync('pnpm', ['exec', 'changeset', 'status', `--output=${rel}`], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      // Swallowing this cost a CI round-trip: `changeset status` resolves the configured
      // baseBranch as a LOCAL ref, and a PR checkout has only origin/main, so it failed
      // with a message nobody could see. Changesets writes its diagnostics to stdout and
      // an unrelated /dev/tty warning to stderr on non-interactive runners, so include
      // both and let the reader judge.
      const detail = [error.stdout, error.stderr]
        .map((s) => s?.toString().trim())
        .filter(Boolean)
        .join('\n');
      throw new Error(`changeset status failed${detail ? `:\n${detail}` : ''}`);
    }
    return JSON.parse(readFileSync(join(dir, 'status.json'), 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Levels declared at one ref, or null when the file does not exist there.
 *
 * Parsed with Changesets' own parser rather than by hand. A partial YAML reader diverges on
 * flow mappings, block scalars, anchors and tags, and every divergence is the same failure:
 * Changesets computes a major that this script reports as no major, and the gate opens.
 *
 * Only a genuine absence returns null. A read that fails for any other reason throws, because
 * treating it as "no levels" would under-report a major.
 */
function levelsAtRef(ref, file) {
  const spec = `${ref}:${file}`;
  try {
    execFileSync('git', ['cat-file', '-e', spec], { cwd: REPO_ROOT, stdio: 'ignore' });
  } catch {
    return null;
  }
  const levels = {};
  for (const release of parseChangeset(git('show', spec)).releases ?? []) {
    levels[release.name] = release.type;
  }
  return levels;
}

/**
 * Majors this PR introduces, per package.
 *
 * Renames are followed (`-M`): renaming a changeset while raising it to major would otherwise
 * report as `R` and be skipped entirely.
 *
 * The base comparison is per package, not per file. A changeset already declaring one package
 * major must not mask a *different* package being raised to major in the same file.
 *
 * `-z` because git C-quotes unusual paths otherwise, and a quoted path fails the changeset
 * name test and drops out of the scan.
 */
function addedChangesetLevels(base) {
  const raw = execFileSync(
    'git',
    [
      'diff',
      '--name-status',
      '-z',
      '-M',
      '--diff-filter=AMR',
      `${base}..${head}`,
      '--',
      '.changeset',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const fields = raw.split('\0').filter((f) => f !== '');

  // `[^]` rather than `.`: a filename containing a line terminator would otherwise fail
  // this test and drop out of the scan entirely.
  const isChangeset = (f) => /^\.changeset\/[^]+\.md$/.test(f) && !/README\.md$/.test(f);
  const levels = [];
  const touched = [];

  for (let i = 0; i < fields.length; ) {
    const code = fields[i];
    // A rename consumes three fields (status, old, new); add and modify consume two.
    const isRename = code.startsWith('R');
    const basePath = fields[i + 1];
    const headPath = isRename ? fields[i + 2] : fields[i + 1];
    i += isRename ? 3 : 2;
    if (!isChangeset(headPath)) continue;
    touched.push(headPath);

    const headLevels = levelsAtRef(head, headPath) ?? {};
    const baseLevels = levelsAtRef(base, basePath);
    for (const [pkg, level] of Object.entries(headLevels)) {
      if (level !== 'major') continue;
      if (baseLevels && baseLevels[pkg] === 'major') continue; // already breaking before this PR
      levels.push({ file: headPath, level, package: pkg });
    }
  }
  return { added: touched, levels };
}

const status = changesetStatus();
const releases = status.releases ?? [];
const majors = releases.filter((r) => r.type === 'major');
const versions = [...new Set(releases.map((r) => r.newVersion))];

// The `fixed` group in .changeset/config.json versions all three packages in lockstep,
// so a single version string describes the release. If that ever stops being true the
// signoff comment would be ambiguous about which version is being approved, so fail
// loudly rather than pick one.
if (versions.length > 1) {
  console.error(
    `preview-release: expected one version across packages, got ${versions.join(', ')}. ` +
      `The 'fixed' group in .changeset/config.json may have changed.`,
  );
  process.exit(1);
}

const { added, levels } = addedChangesetLevels(args.base);

console.log(
  JSON.stringify({
    current: releases[0]?.oldVersion ?? null,
    next: versions[0] ?? null,
    release_type: majors.length ? 'major' : (releases[0]?.type ?? null),
    is_major: majors.length > 0,
    introduced_major: levels.some((l) => l.level === 'major'),
    packages: releases.map((r) => r.name),
    added_changesets: added,
  }),
);
