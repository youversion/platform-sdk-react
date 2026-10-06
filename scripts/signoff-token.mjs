#!/usr/bin/env node
/**
 * The identifier a breaking-change signoff names.
 *
 * Pinning a signoff to the head commit meant every push voided it, so a lint fix or a review
 * tweak cost a fresh signoff while changing nothing about the release. That trains people to
 * rubber-stamp the gate, and it is stricter than this repo's own review policy, which keeps
 * approvals across pushes (`dismiss_stale_reviews_on_push: false`).
 *
 * Keyed on every changeset at head plus the resulting version, deliberately wider than "only the
 * changesets declaring major": any changeset edit can move the release, and erring toward asking
 * again is the safe direction. Blob ids come from git, so the hash changes if and only if the
 * content does. Renaming a changeset re-triggers, which is correct: Changesets reads it by path.
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

export function signoffToken({ repoRoot, head, nextVersion }) {
  const raw = execFileSync('git', ['ls-tree', '-r', '-z', head, '--', '.changeset'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const entries = raw
    .split('\0')
    .filter((line) => line !== '')
    .map((line) => {
      // `<mode> <type> <object>\t<path>`. Split at the first tab only: a path may contain one,
      // and losing its tail would drop the file from the digest, so an edit to it would not
      // re-trigger a signoff.
      const tab = line.indexOf('\t');
      return { meta: line.slice(0, tab), path: line.slice(tab + 1) };
    })
    .filter(({ path }) => isChangesetPath(path))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(({ meta, path }) => `${meta.split(/\s+/)[2]} ${path}`);

  return createHash('sha256')
    .update(`${nextVersion ?? ''}\n${entries.join('\n')}`)
    .digest('hex')
    .slice(0, 16);
}
