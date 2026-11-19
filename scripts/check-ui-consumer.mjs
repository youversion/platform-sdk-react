#!/usr/bin/env node
// Exercise packed exports with pnpm's isolated dependency layout, not workspace aliases.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(join(tmpdir(), 'yv-ui-consumer-'));
const fixture = join(root, 'scripts/fixtures/ui-consumer');
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' });

try {
  const tarballs = {};
  for (const directory of ['core', 'hooks', 'ui']) {
    const cwd = join(root, 'packages', directory);
    const manifest = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    run('pnpm', ['pack', '--out', join(temp, `${directory}.tgz`)], cwd);
    tarballs[manifest.name] = `file:${join(temp, `${directory}.tgz`)}`;
  }

  for (const sdk of ['@youversion/platform-react-ui', '@youversion/platform-react-hooks']) {
    const cwd = join(temp, sdk.endsWith('-ui') ? 'ui' : 'headless');
    mkdirSync(cwd);
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: { [sdk]: tarballs[sdk], react: '19.1.2', 'react-dom': '19.1.2' },
        devDependencies: {
          jsdom: '28.1.0',
          '@types/react': '19.1.2',
          '@types/react-dom': '19.1.2',
        },
      }),
    );
    writeFileSync(
      join(cwd, 'pnpm-workspace.yaml'),
      `packages: []\nnodeLinker: isolated\noverrides:\n${Object.entries(tarballs)
        .map(([name, path]) => `  '${name}': '${path}'`)
        .join('\n')}\n`,
    );
    copyFileSync(join(fixture, 'runtime.mjs'), join(cwd, 'runtime.mjs'));
    run('pnpm', ['install', '--ignore-scripts'], cwd);

    writeFileSync(
      join(cwd, 'types.tsx'),
      readFileSync(join(fixture, 'types.tsx'), 'utf8').replaceAll(
        '@youversion/platform-react-ui',
        sdk,
      ),
    );
    run(
      join(root, 'node_modules/.bin/tsc'),
      [
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--jsx',
        'react-jsx',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--target',
        'es2020',
        join(cwd, 'types.tsx'),
      ],
      cwd,
    );
    for (const format of ['esm', 'cjs']) {
      run(process.execPath, ['runtime.mjs', sdk, format], cwd);
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
