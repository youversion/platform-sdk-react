// Drives signoffToken against real git trees. Each case mutates a scratch repo and asserts
// whether the token moved, which is the property the gate relies on.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { signoffToken } from '../../scripts/signoff-token.mjs'

const repo = mkdtempSync(join(tmpdir(), 'signoff-token-'))
const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim()
const commit = (msg) => { git('add', '-A'); git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', msg); return git('rev-parse', 'HEAD') }
const tok = (head, v = '2.0.0') => signoffToken({ repoRoot: repo, head, nextVersion: v })

git('init', '-q', '-b', 'main'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't')
mkdirSync(join(repo, '.changeset'))
writeFileSync(join(repo, '.changeset', 'a.md'), "---\n'p': major\n---\n\nbreak\n")
writeFileSync(join(repo, '.changeset', 'README.md'), 'docs\n')
writeFileSync(join(repo, 'src.txt'), 'code\n')
const base = commit('base'); const baseTok = tok(base)

const results = []
const check = (name, actual, expectSame) =>
  results.push({ name, ok: (actual === baseTok) === expectSame, actual, expectSame })

writeFileSync(join(repo, 'src.txt'), 'code changed\n')
check('ordinary code push keeps the token', tok(commit('code')), true)

writeFileSync(join(repo, '.changeset', 'README.md'), 'docs edited\n')
check('editing .changeset/README.md keeps the token', tok(commit('readme')), true)

check('a version change replaces the token', tok(git('rev-parse', 'HEAD'), '2.0.1'), false)

const afterDocs = git('rev-parse', 'HEAD')
writeFileSync(join(repo, '.changeset', 'b.md'), "---\n'p': patch\n---\n\nfix\n")
check('adding a changeset replaces the token', tok(commit('add changeset')), false)

git('reset', '-q', '--hard', afterDocs)
writeFileSync(join(repo, '.changeset', 'a.md'), "---\n'p': major\n---\n\nbreak differently\n")
check('editing a changeset replaces the token', tok(commit('edit changeset')), false)

git('reset', '-q', '--hard', afterDocs)
rmSync(join(repo, '.changeset', 'a.md'))
check('deleting a changeset replaces the token', tok(commit('delete changeset')), false)

git('reset', '-q', '--hard', afterDocs)
renameSync(join(repo, '.changeset', 'a.md'), join(repo, '.changeset', 'renamed.md'))
check('renaming a changeset replaces the token', tok(commit('rename changeset')), false)

// A tab in the path is why the blob line is split at the first tab only. Splitting on every
// tab drops the file from the digest, and a dropped file cannot be seen to change, so the
// discriminating assertion is that EDITING it moves the token.
git('reset', '-q', '--hard', afterDocs)
renameSync(join(repo, '.changeset', 'a.md'), join(repo, '.changeset', 'with\ttab.md'))
const tabBefore = tok(commit('tab-named changeset'))
writeFileSync(join(repo, '.changeset', 'with\ttab.md'), "---\n'p': major\n---\n\nbreak, reworded\n")
const tabAfter = tok(commit('edit the tab-named changeset'))
results.push({
  name: 'editing a tab-named changeset replaces the token',
  ok: tabBefore !== tabAfter,
})

rmSync(repo, { recursive: true, force: true })
for (const r of results) console.log(`${r.ok ? 'ok' : 'FAIL'}\t${r.name}`)
process.exit(results.every((r) => r.ok) ? 0 : 1)
