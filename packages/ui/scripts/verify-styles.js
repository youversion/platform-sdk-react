import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripLayerBlocks } from './strip-layer-blocks.js';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

const cssPath = resolve(dist, 'tailwind.css');
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf-8') : '';
if (!css.trim()) {
  errors.push('dist/tailwind.css is missing or empty — did build:css run?');
} else {
  const unlayered = stripLayerBlocks(css);
  if (!unlayered.includes('revert-layer')) {
    errors.push(
      'dist/tailwind.css missing unlayered A2 revert-layer rule (must not live inside @layer)',
    );
  }
  if (!unlayered.includes('-webkit-appearance:revert-layer')) {
    errors.push(
      'dist/tailwind.css missing -webkit-appearance:revert-layer on the unlayered A2 rule',
    );
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

  if (!js.includes('revert-layer')) {
    errors.push('dist/index.js missing A2 revert-layer isolation rule');
  }
}

if (errors.length > 0) {
  console.error('❌ Style verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('✅ Style verification passed');
