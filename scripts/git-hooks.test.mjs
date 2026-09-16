import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

test('pre-commit recovery preserves commit-msg and the full branch range check', () => {
  const repo = mkdtempSync(join(tmpdir(), 'sdk-git-hooks-'));
  const env = {
    ...process.env,
    HUSKY: '1',
    SKIP_PRE_COMMIT: '',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    XDG_CONFIG_HOME: join(repo, 'config'),
    HOME: repo,
  };
  const run = (command, args, overrides = {}) => {
    const result = spawnSync(command, args, {
      cwd: repo,
      env: { ...env, ...overrides },
      encoding: 'utf8',
    });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  };
  const ok = (command, args, overrides) => {
    const result = run(command, args, overrides);
    assert.equal(result.status, 0, result.output);
    return result.output.trim();
  };
  const commit = (message, overrides) =>
    run('git', ['commit', '--allow-empty', '-m', message], overrides);

  try {
    ok('git', ['init', '-q', '-b', 'main']);
    ok('git', ['config', 'user.name', 'Hook test']);
    ok('git', ['config', 'user.email', 'hook-test@example.com']);
    ok('git', ['config', 'commit.gpgsign', 'false']);
    // An invalid base subject must be excluded from the branch range.
    ok('git', ['commit', '--allow-empty', '-m', 'fixture base']);
    ok('git', ['remote', 'add', 'origin', repo]);
    ok('git', ['switch', '-c', 'test-recovery']);
    mkdirSync(join(repo, '.husky'));
    for (const hook of ['pre-commit', 'commit-msg']) {
      copyFileSync(join(root, '.husky', hook), join(repo, '.husky', hook));
    }
    copyFileSync(join(root, 'commitlint.config.js'), join(repo, 'commitlint.config.js'));
    symlinkSync(join(root, 'node_modules'), join(repo, 'node_modules'), 'dir');
    writeFileSync(
      join(repo, 'package.json'),
      JSON.stringify({
        type: 'module',
        packageManager: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).packageManager,
        scripts: { 'lint-staged': 'echo lint-staged-fixture-failed; exit 42' },
      }),
    );
    ok('pnpm', ['exec', 'husky']);

    for (const bypass of ['', '0']) {
      const blocked = commit('chore: valid but staged checks fail', { SKIP_PRE_COMMIT: bypass });
      assert.notEqual(blocked.status, 0, blocked.output);
      assert.match(blocked.output, /lint-staged-fixture-failed/);
    }
    const before = ok('git', ['rev-parse', 'HEAD']);
    const invalid = commit('merge: deliberately invalid type', { SKIP_PRE_COMMIT: '1' });
    assert.notEqual(invalid.status, 0, invalid.output);
    assert.match(invalid.output, /type-enum/);
    assert.doesNotMatch(invalid.output, /lint-staged-fixture-failed/);
    assert.equal(ok('git', ['rev-parse', 'HEAD']), before);

    const valid = commit('chore: recover from failed tooling', { SKIP_PRE_COMMIT: '1' });
    assert.equal(valid.status, 0, valid.output);
    assert.doesNotMatch(valid.output, /lint-staged-fixture-failed/);
    assert.notEqual(ok('git', ['rev-parse', 'HEAD']), before);
    ok('sh', [join(root, 'scripts/check-commits.sh')]);

    // Simulate a commit authored outside the local hooks, as CI must catch it.
    ok('git', [
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--allow-empty',
      '-m',
      'merge: invalid',
    ]);
    ok('git', ['commit', '--allow-empty', '-m', 'chore: valid tip'], { SKIP_PRE_COMMIT: '1' });
    const range = run('sh', [join(root, 'scripts/check-commits.sh')]);
    assert.notEqual(range.status, 0, range.output);
    assert.match(range.output, /type-enum/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
