import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

const cssPath = resolve(dist, 'tailwind.css');
if (!existsSync(cssPath) || readFileSync(cssPath, 'utf-8').trim().length === 0) {
  errors.push('dist/tailwind.css is missing or empty — did build:css run?');
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

  // Proves two things at once: __YV_STYLES__ holds real CSS rather than the
  // empty-string fallback tsup substitutes when dist/tailwind.css is absent, and
  // that build:css:scope ran. Only scope-selectors.mjs emits this string.
  if (!js.includes(':is([data-yv-sdk],[data-yv-sdk] *)')) {
    errors.push(
      'dist/index.js has no gated selectors — __YV_STYLES__ is empty or build:css:scope did not run',
    );
  }

  // The `yv-sdk-` prefix is deliberate. Tailwind emits `@layer properties` on
  // its own for the @property fallback, regardless of our directives, and that
  // block only sets --tw-* custom properties. Asserting on `@layer` alone would
  // fail on Tailwind's own output.
  if (/@layer yv-sdk-/.test(js)) {
    errors.push(
      "SDK CSS is still layered — layered rules lose to a consumer's unlayered CSS at any specificity",
    );
  }
}

if (errors.length > 0) {
  console.error('❌ Style verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('✅ Style verification passed');
