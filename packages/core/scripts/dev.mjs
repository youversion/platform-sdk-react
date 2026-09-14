#!/usr/bin/env node
/**
 * Watch JS (tsup) and rebuild `dist/styles` when `src/styles/*.css` changes.
 * Public CSS exports resolve from generated `dist/styles`, so `pnpm dev` must
 * keep those files fresh for the UI Tailwind watcher.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = join(dirname(fileURLToPath(import.meta.url)), '..');

const children = [
  spawn('tsup', ['--watch'], { stdio: 'inherit', cwd }),
  spawn(
    process.execPath,
    ['--watch-path=src/styles', '--watch-preserve-output', 'scripts/minify-browser-css.mjs'],
    { stdio: 'inherit', cwd },
  ),
];

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGINT') return;
    if (code !== null && code !== 0) shutdown(code);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
