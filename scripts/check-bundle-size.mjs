#!/usr/bin/env node
/**
 * CI bundle-size gate.
 *
 * `pnpm size` stays the raw size-limit table. This script is what CI runs.
 * Within-limit builds pass. Any other diff fails when a ceiling is exceeded.
 * A pure locale sync may grow `ui / YouVersionProvider only` and
 * `ui / full barrel`: those ceilings move to the measured brotli size,
 * rounded up to the next whole kB. The updated `.size-limit.js` is written
 * and the process exits 1 so that file can be committed. This script does
 * not commit or push.
 *
 * The diff base is `origin/$GITHUB_BASE_REF`, or `origin/main` when that
 * ref is unset. CI checks out one commit, so the base ref is fetched with
 * `--depth=1` — the two trees are enough; full history is not.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLimitUpdates,
  decideSizeLimitAction,
  parseChangedPaths,
} from './bundle-size-policy.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sizeLimitBin = join(dirname(require.resolve('size-limit/package.json')), 'bin.js');

/**
 * @param {number} sizeBytes
 * @returns {string}
 */
function formatMetricBytes(sizeBytes) {
  if (Math.abs(sizeBytes) < 1000) return `${Math.round(sizeBytes)} B`;
  return `${(sizeBytes / 1000).toFixed(2)} kB`;
}

/**
 * @param {Array<{ name?: string, passed?: boolean, size?: number, sizeLimit?: number }>} checks
 * @returns {string}
 */
function formatSizeReport(checks) {
  const lines = [''];
  for (const check of checks) {
    lines.push(check.name ?? '(unnamed)');
    if (
      check.passed === false &&
      typeof check.size === 'number' &&
      typeof check.sizeLimit === 'number'
    ) {
      lines.push(
        `  Package size limit has exceeded by ${formatMetricBytes(check.size - check.sizeLimit)}`,
      );
    }
    if (typeof check.sizeLimit === 'number') {
      lines.push(`  Size limit: ${formatMetricBytes(check.sizeLimit)}`);
    }
    if (typeof check.size === 'number') {
      lines.push(`  Size:       ${formatMetricBytes(check.size)} brotli`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string[]} args
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function git(args) {
  return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

/**
 * @param {string} name
 * @returns {string}
 */
function remoteBase(name) {
  if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.includes('..') || name.startsWith('-')) {
    throw new Error(`Unexpected base ref: ${name}`);
  }
  const remoteRef = `origin/${name}`;
  if (process.env.GITHUB_ACTIONS === 'true') {
    const fetched = git(['fetch', '--no-tags', '--depth=1', 'origin', name]);
    if (fetched.status !== 0) {
      throw new Error(`Failed to fetch ${remoteRef}:\n${fetched.stderr ?? ''}`);
    }
    return remoteRef;
  }
  const verified = git(['rev-parse', '--verify', '--quiet', remoteRef]);
  if (verified.status !== 0) {
    throw new Error(`Missing ${remoteRef}. Fetch it before running the bundle-size check.`);
  }
  return remoteRef;
}

/**
 * @param {string} base
 * @returns {string[]}
 */
function changedFiles(base) {
  const diff = git(['diff', '--name-status', '--find-renames', base, 'HEAD']);
  if (diff.status !== 0) {
    throw new Error(`git diff ${base} HEAD failed:\n${diff.stderr ?? ''}`);
  }
  return parseChangedPaths(diff.stdout ?? '');
}

/**
 * @returns {{ checks: Array<{ name?: string, passed?: boolean, size?: number, sizeLimit?: number }>, status: number }}
 */
function measure() {
  const result = spawnSync(process.execPath, [sizeLimitBin, '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const stdout = result.stdout ?? '';
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (err) {
    const detail = err instanceof SyntaxError ? err.message : 'unreadable size-limit output';
    throw new Error(
      `size-limit did not return JSON (exit ${result.status ?? 'unknown'}): ${detail}\n${stdout}\n${result.stderr ?? ''}`,
    );
  }
  if (!Array.isArray(parsed)) {
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed ? String(parsed.error) : stdout;
    throw new Error(`size-limit failed:\n${message}\n${result.stderr ?? ''}`);
  }
  return { checks: parsed, status: result.status ?? 1 };
}

/**
 * @param {readonly { name: string, limit: string }[]} updates
 * @returns {string}
 */
function formatUpdates(updates) {
  return updates.map((update) => `  ${update.name}: ${update.limit}`).join('\n');
}

function main() {
  const baseName = process.env.GITHUB_BASE_REF || 'main';
  const base = remoteBase(baseName);
  const files = changedFiles(base);
  const { checks, status } = measure();
  process.stdout.write(formatSizeReport(checks));

  const decision = decideSizeLimitAction(checks, files);
  if (decision.status === 'pass') {
    if (status !== 0) process.exit(status || 1);
    return;
  }
  if (decision.status === 'fail') {
    process.stdout.write('Package size limit has exceeded\n');
    process.exit(1);
  }

  const sizeLimitPath = join(repoRoot, '.size-limit.js');
  const current = readFileSync(sizeLimitPath, 'utf8');
  const updated = applyLimitUpdates(current, decision.updates);
  const summary = `Raised UI size limits for locale catalogs:\n${formatUpdates(decision.updates)}\n`;
  if (updated === current) {
    process.stdout.write('Package size limit has exceeded\n');
    process.stdout.write(summary);
    process.exit(1);
  }
  writeFileSync(sizeLimitPath, updated);
  process.stdout.write(summary);
  process.stdout.write('Commit the new limits in .size-limit.js.\n');
  process.exit(1);
}

try {
  main();
} catch (err) {
  const detail = err instanceof Error ? err.message : 'bundle-size check failed';
  process.stderr.write(`${detail}\n`);
  process.exit(1);
}
