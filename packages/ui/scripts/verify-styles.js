import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

const cssPath = resolve(dist, 'tailwind.css');
if (!existsSync(cssPath) || readFileSync(cssPath, 'utf-8').trim().length === 0) {
  errors.push('dist/tailwind.css is missing or empty — did build:css run?');
}

const stylexPath = resolve(dist, 'stylex.css');
if (!existsSync(stylexPath) || readFileSync(stylexPath, 'utf-8').trim().length === 0) {
  errors.push('dist/stylex.css is missing or empty — did build:stylex run?');
} else {
  const stylex = readFileSync(stylexPath, 'utf-8');
  if (!stylex.includes('yv-stylex-spike')) {
    errors.push('dist/stylex.css missing StyleX spike marker');
  }
  if (stylex.includes('@layer yv-sdk-utilities') || stylex.includes('@utility card-content')) {
    errors.push('dist/stylex.css contains Tailwind bundle markers');
  }
}

const jsPath = resolve(dist, 'index.js');
if (!existsSync(jsPath)) {
  errors.push('dist/index.js is missing — did build:js run?');
} else {
  const js = readFileSync(jsPath, 'utf-8');

  if (!/href:\s*"yv-sdk-styles"/.test(js)) {
    errors.push('dist/index.js missing style href — YvStyles component not in bundle');
  }

  if (!/precedence:\s*"yv-sdk"/.test(js)) {
    errors.push('dist/index.js missing style precedence — React 19 integration not in bundle');
  }

  if (!js.includes('@layer yv-sdk-styles')) {
    errors.push(
      'dist/index.js missing actual CSS content — __YV_STYLES__ was not replaced with real CSS',
    );
  }

  if (!js.includes('yv-stylex-spike')) {
    errors.push(
      'dist/index.js missing StyleX sheet — __YV_STYLEX_STYLES__ was not replaced with real CSS',
    );
  }

  if (/stylex\.create\s*\(\{/.test(js)) {
    errors.push('dist/index.js still contains stylex.create({) — StyleX was not precompiled');
  }
}

if (errors.length > 0) {
  console.error('❌ Style verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('✅ Style verification passed');
