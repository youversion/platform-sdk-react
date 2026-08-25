import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = fileURLToPath(new URL('..', import.meta.url));
const distJs = resolve(uiRoot, 'dist/index.js');
const distCss = resolve(uiRoot, 'dist/stylex.css');
const pkg = JSON.parse(readFileSync(resolve(uiRoot, 'package.json'), 'utf8'));

if (!existsSync(distJs) || !existsSync(distCss)) {
  throw new Error('Build the UI package before proving the Metro pin.');
}

const js = readFileSync(distJs, 'utf8');
const failures = [];
if (/stylex\.create\s*\(\{/.test(js)) {
  failures.push('dist/index.js still contains stylex.create({) — Metro would need StyleX Babel');
}
if (js.includes('@stylexjs/babel-plugin')) {
  failures.push('dist/index.js references @stylexjs/babel-plugin');
}
if (!js.includes('yv-stylex-spike')) {
  failures.push('dist/index.js is missing the StyleX spike sheet');
}

const pack = execFileSync('pnpm', ['pack', '--pack-destination', tmpdir()], {
  cwd: uiRoot,
  encoding: 'utf8',
}).trim();
const tarball = pack.split('\n').at(-1) ?? pack;
const listing = execFileSync('tar', ['-tf', tarball], { encoding: 'utf8' });
if (listing.includes('/src/')) {
  failures.push('packed tarball includes src; Metro could resolve uncompiled StyleX');
}

if (failures.length > 0) {
  console.error(failures.map((line) => `  - ${line}`).join('\n'));
  process.exit(1);
}

console.log('Metro pin evidence');
console.log(`  packed: ${tarball}`);
console.log(`  pin: pnpm add ${pkg.name}@file:${tarball}`);
console.log('  Metro does not need StyleX Babel: dist has no stylex.create({) and no babel-plugin.');
console.log('  Expo example (platform-sdk-reactnative-expo): pin that tarball and render BibleCard.');
