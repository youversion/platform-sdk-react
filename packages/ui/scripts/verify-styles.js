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

  // This check proves two things at once. __YV_STYLES__ holds real CSS, not the
  // empty string that tsup substitutes when dist/tailwind.css is absent. And
  // build:css:scope ran, because only scope-selectors.mjs emits this string.
  //
  // The `:where(:not(…))` is the slot boundary, and it is part of the literal on
  // purpose. A build that emitted the older gate without it would ship a sheet
  // that restyles consumer `children`, and a check for the older gate alone
  // would pass. The `:where()` keeps the gate at 0,1,0. Lightning CSS drops the
  // redundant `*` before it.
  // See docs/adr/0008-stop-sdk-css-at-consumer-slots.md.
  if (
    !js.includes(':is([data-yv-sdk],[data-yv-sdk] :where(:not([data-yv-slot],[data-yv-slot] *)))')
  ) {
    errors.push(
      'dist/index.js has no gated selectors. __YV_STYLES__ is empty, or build:css:scope did not run',
    );
  }

  // The sheet ships inside one declared `@layer yv`. Together with the
  // `!important` pass in scope-selectors.mjs, that is what beats a consumer's
  // important and high-specificity rules: CSS Cascade 5 reverses layer order for
  // important declarations, and ranks unlayered-important last.
  if (!/@layer yv\{/.test(js)) {
    errors.push(
      'dist/index.js has no `@layer yv{` wrapper. Without the layer, the !important pass ' +
        'in build:css:scope loses to an unlayered consumer !important rule',
    );
  }

  // The `yv-sdk-` prefix is deliberate, and this check is not the one above.
  // `yv-sdk-*` was a set of *priority sub-layers* that we deleted; nothing may
  // bring them back. A check for `@layer` alone would also fail on Tailwind's
  // own `@layer properties` block, which it emits for the @property fallback
  // whatever our directives say.
  if (/@layer yv-sdk-/.test(js)) {
    errors.push(
      'SDK CSS uses the deleted `yv-sdk-*` priority sub-layers. The sheet ships in one ' +
        '`@layer yv` block instead',
    );
  }
}

if (errors.length > 0) {
  console.error('❌ Style verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('✅ Style verification passed');
