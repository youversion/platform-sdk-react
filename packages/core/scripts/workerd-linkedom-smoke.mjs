#!/usr/bin/env node
/**
 * Spawns `wrangler dev --local` against the linkedom workerd smoke worker,
 * hits it once, and exits non-zero on failure.
 *
 * Why this exists: jsdom/happy-dom can bundle for Workers and still die on the
 * first request. A dry-run deploy would miss that. This runs the real runtime.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeDir = path.join(__dirname, 'workerd-smoke');
const require = createRequire(import.meta.url);

// Resolve linkedom from packages/core so wrangler's bundler can find it.
try {
  require.resolve('linkedom');
} catch {
  console.error('linkedom is not installed in @youversion/platform-core');
  process.exit(1);
}

const port = 8787 + Math.floor(Math.random() * 1000);

const child = spawn(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  [
    'dlx',
    'wrangler@4.118.0',
    'dev',
    '--local',
    '--port',
    String(port),
    '--config',
    path.join(smokeDir, 'wrangler.toml'),
  ],
  {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  },
);

let output = '';
const onData = (buf) => {
  output += buf.toString();
};

child.stdout.on('data', onData);
child.stderr.on('data', onData);

const ready =
  /Ready on|Local:|http:\/\/127\.0\.0\.1:|http:\/\/localhost:/i;

const deadline = Date.now() + 90_000;

async function waitForReady() {
  while (Date.now() < deadline) {
    if (ready.test(output) || output.includes(`127.0.0.1:${port}`)) {
      return;
    }
    if (child.exitCode !== null) {
      throw new Error(`wrangler exited early (${child.exitCode})\n${output}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for wrangler\n${output}`);
}

try {
  await waitForReady();
  const res = await fetch(`http://127.0.0.1:${port}/`);
  const body = await res.text();
  if (!res.ok || !body.startsWith('OK')) {
    throw new Error(`Smoke failed: HTTP ${res.status} body=${body}\n${output}`);
  }
  console.log(body);
  process.exitCode = 0;
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  // Ensure the process tree does not hang CI.
  setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {
      // ignore
    }
    process.exit(process.exitCode ?? 1);
  }, 2000).unref();
}
