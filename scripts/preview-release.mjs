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

const git = (...a) => execFileSync('git', a, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

/**
 * `changeset status` writes its JSON relative to the repo root, not the cwd, and prints
 * a `/dev/tty` warning on non-interactive runners. Write to a temp dir inside the repo
 * and read it back rather than parsing stdout.
 */
function changesetStatus() {
  const dir = mkdtempSync(join(REPO_ROOT, '.changeset-status-'));
  const rel = join(relative(REPO_ROOT, dir), 'status.json');
  try {
    execFileSync('pnpm', ['exec', 'changeset', 'status', `--output=${rel}`], {
      cwd: REPO_ROOT,
      stdio: 'ignore',
    });
    return JSON.parse(readFileSync(join(dir, 'status.json'), 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Bump levels declared by the changeset files this PR adds. */
function addedChangesetLevels(base) {
  const added = git(
    'diff',
    '--name-only',
    '--diff-filter=A',
    `${base}..${head}`,
    '--',
    '.changeset',
  )
    .split('\n')
    .filter((f) => /^\.changeset\/.+\.md$/.test(f) && !/README\.md$/.test(f));

  const levels = [];
  for (const file of added) {
    // Read from the ref rather than the working tree: the runner checks out head,
    // but this keeps the script usable for any base..head pair.
    const body = git('show', `${head}:${file}`);
    const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) continue; // an empty changeset (`changeset --empty`) has no releases
    for (const line of frontmatter[1].split(/\r?\n/)) {
      const m = line.match(/:\s*(major|minor|patch)\s*$/);
      if (m) levels.push({ file, level: m[1] });
    }
  }
  return { added, levels };
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
