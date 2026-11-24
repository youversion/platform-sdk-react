// Run after building the SDK. Requires registry access for a clean pnpm install.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'yv-ui-consumer-'));
const manifest = (cwd) => JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' });
const pnpm = (args, cwd = root) => run('corepack', ['pnpm', ...args], cwd);
const policy = (key) =>
  JSON.parse(
    execFileSync('corepack', ['pnpm', 'config', 'get', key, '--json'], {
      cwd: root,
      encoding: 'utf8',
    }),
  );

try {
  const { packageManager, devDependencies } = manifest(root);
  const { jsdom, '@types/jsdom': jsdomTypes } = manifest(
    join(root, 'packages/core'),
  ).devDependencies;
  const overrides = policy('overrides');
  const tarballs = {};
  for (const folder of ['core', 'hooks', 'ui']) {
    const cwd = join(root, 'packages', folder);
    const archive = join(temp, `${folder}.tgz`);
    pnpm(['pack', '--out', archive], cwd);
    tarballs[manifest(cwd).name] = `file:./${folder}.tgz`;
  }

  const ui = '@youversion/platform-react-ui';
  writeFileSync(
    join(temp, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      packageManager,
      dependencies: {
        [ui]: tarballs[ui],
        react: overrides.react,
        'react-dom': overrides['react-dom'],
      },
      devDependencies: {
        jsdom,
        '@types/jsdom': jsdomTypes,
        '@types/node': devDependencies['@types/node'],
        '@types/react': overrides['@types/react'],
        '@types/react-dom': overrides['@types/react-dom'],
      },
    }),
  );
  writeFileSync(
    join(temp, 'pnpm-workspace.yaml'),
    `packages: []\nnodeLinker: isolated\nminimumReleaseAge: ${policy('minimumReleaseAge')}\noverrides: ${JSON.stringify({ ...overrides, ...tarballs })}\n`,
  );
  copyFileSync(join(root, 'scripts/fixtures/ui-consumer.ts'), join(temp, 'consumer.ts'));
  pnpm(['install', '--ignore-scripts', '--prefer-offline', '--no-frozen-lockfile'], temp);
  // UI's existing shipped declarations have unresolved aliases. Check the new
  // consumer imports in Bundler mode, not the full UI declaration graph.
  run(
    join(root, 'node_modules/.bin/tsc'),
    [
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
      '--types',
      'node',
      'consumer.ts',
    ],
    temp,
  );
  for (const format of ['esm', 'cjs']) run(process.execPath, ['consumer.ts', format], temp);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
