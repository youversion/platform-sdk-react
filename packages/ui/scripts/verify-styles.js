import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

function stripLayerBlocks(css) {
  let result = '';
  let i = 0;
  while (i < css.length) {
    const start = css.indexOf('@layer', i);
    if (start === -1) {
      result += css.slice(i);
      break;
    }
    result += css.slice(i, start);
    const brace = css.indexOf('{', start);
    const semi = css.indexOf(';', start);
    if (brace === -1 || (semi !== -1 && semi < brace)) {
      i = (semi === -1 ? start + 6 : semi) + 1;
      continue;
    }
    let depth = 0;
    let j = brace;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          j += 1;
          break;
        }
      }
    }
    i = j;
  }
  return result;
}

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
