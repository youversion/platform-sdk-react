#!/usr/bin/env node
/**
 * The identifier a breaking-change signoff names.
 *
 * Pinning a signoff to the head commit meant every push voided it, so a lint fix or a review
 * tweak cost a fresh signoff while changing nothing about the release. That trains people to
 * rubber-stamp the gate, and it is stricter than this repo's own review policy, which keeps
 * approvals across pushes (`dismiss_stale_reviews_on_push: false`).
 *
 * Keyed on the changesets this PR adds, edits, renames or removes since `base` (the merge-base), plus
 * `.changeset/config.json` at head and the resulting version. Keying on every changeset at head
 * voided the signoff whenever main was merged in, because main brings other PRs' changesets.
 * Every changeset this PR touches counts, not only the ones declaring major: any changeset edit
 * can move the release, and erring toward asking again is the safe direction. Blob ids come from
 * git, so the hash changes if and only if the content does. Renaming a changeset re-triggers,
 * which is correct: Changesets reads it by path.
 *
 * `config.json` is read from the head commit, not the working tree: the preview job restores
 * main's copy before running, but after the merge this PR's copy is the one that governs.
 *
 * 16 hex characters (64 bits). The signoff names this value, so a collaborator who wanted a
 * different release to inherit an existing signoff would have to grind a second preimage against
 * it; 64 bits puts that out of reach, where a short prefix would not.
 *
 * Lives in its own module so the gate's suite can exercise it against real git trees. Testing it
 * through `preview-release.mjs` would mean standing up Changesets and a workspace first, which is
 * how it previously shipped covered only by assertions about the workflow's text.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

/** Mirrors @changesets/read: a `.md` under `.changeset/` that is not README. */
export const isChangesetPath = (f) =>
  /^\.changeset\/[^]+\.md$/.test(f) && !/README\.md$/.test(f);

export function signoffToken({ repoRoot, base, head, nextVersion }) {
  const git = (...args) =>
    execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // `--raw -z`: `:<old mode> <new mode> <old blob> <new blob> <status>`, then one path, or two
  // for a rename. `-z` keeps unusual paths unquoted, so they still pass the eligibility test.
  const fields = git('diff', '--raw', '-z', '-M', '--no-abbrev', base, head, '--', '.changeset')
    .split('\0')
    .filter((f) => f !== '');
  const changes = [];
  for (let i = 0; i < fields.length; ) {
    const [, newMode, , newBlob, status] = fields[i].split(' ');
    const pathCount = /^[RC]/.test(status) ? 2 : 1;
    const paths = fields.slice(i + 1, i + 1 + pathCount);
    i += 1 + pathCount;
    if (!paths.some(isChangesetPath)) continue;
    changes.push([status[0], newMode, newBlob, ...paths]);
  }
  changes.sort((a, b) => (a.join('\0') < b.join('\0') ? -1 : 1));

  let config = null;
  try {
    config = git('rev-parse', '--verify', '--quiet', `${head}:.changeset/config.json`).trim();
  } catch {
    // Absent at head. Null still hashes distinctly from any blob id.
  }

  return createHash('sha256')
    .update(JSON.stringify({ nextVersion: nextVersion ?? null, config, changes }))
    .digest('hex')
    .slice(0, 16);
}
