import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripLayerBlocks } from './strip-layer-blocks.js';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

const chromeCssPath = resolve(dist, 'chrome.css');
const chromeCss = existsSync(chromeCssPath) ? readFileSync(chromeCssPath, 'utf-8') : '';
if (!chromeCss.trim()) {
  errors.push('dist/chrome.css is missing or empty — did build:css run?');
} else {
  const unlayeredChrome = stripLayerBlocks(chromeCss);
  if (!unlayeredChrome.includes('revert-layer')) {
    errors.push(
      'dist/chrome.css missing unlayered A2 revert-layer rule (Provider-only host isolation)',
    );
  }
  if (!unlayeredChrome.includes('-webkit-appearance:revert-layer')) {
    errors.push('dist/chrome.css missing -webkit-appearance:revert-layer on the unlayered A2 rule');
  }
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

const readerCssPath = resolve(dist, 'bible-reader.css');
const readerCss = existsSync(readerCssPath) ? readFileSync(readerCssPath, 'utf-8') : '';
if (!readerCss.trim()) {
  errors.push('dist/bible-reader.css is missing or empty — did build:css run?');
}

const publicCssPath = resolve(dist, 'styles.css');
const publicCss = existsSync(publicCssPath) ? readFileSync(publicCssPath, 'utf-8') : '';
if (!publicCss.trim()) {
  errors.push('dist/styles.css is missing or empty — did write-public-styles run?');
} else {
  if (!publicCss.includes('scrollbar-hide')) {
    errors.push('dist/styles.css missing full utility sheet');
  }
  if (!publicCss.includes('--yv-reader-font-size')) {
    errors.push('dist/styles.css missing reader typography (manual import contract)');
  }
}

const jsPath = resolve(dist, 'index.js');
if (!existsSync(jsPath)) {
  errors.push('dist/index.js is missing — did build:js run?');
}

if (existsSync(dist)) {
  const jsFiles = readdirSync(dist, { recursive: true, encoding: 'utf8' }).filter((f) =>
    /\.(js|cjs)$/.test(f),
  );
  const js = jsFiles.map((f) => readFileSync(join(dist, f), 'utf8')).join('\n');

  if (!/href:\s*"yv-sdk-styles"/.test(js)) {
    errors.push('style href missing from dist — YvStyles component not in bundle');
  }

  if (!/precedence:\s*"yv-sdk"/.test(js)) {
    errors.push('style precedence missing from dist — React 19 integration not in bundle');
  }

  if (!js.includes('@layer yv-sdk-styles')) {
    errors.push('CSS content missing from dist — __YV_STYLES__ was not replaced with real CSS');
  }

  if (!/href:\s*"yv-sdk-components"/.test(js)) {
    errors.push('component style href missing from dist — YvComponentStyles not in bundle');
  }

  if (!js.includes('scrollbar-hide')) {
    errors.push('component CSS missing from dist — __YV_COMPONENT_STYLES__ was not replaced');
  }

  if (!/href:\s*"yv-sdk-bible-reader"/.test(js)) {
    errors.push('reader style href missing from dist — YvReaderStyles not in bundle');
  }

  if (!js.includes('--yv-reader-font-size')) {
    errors.push('reader CSS missing from dist — __YV_READER_STYLES__ was not replaced');
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
