import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const errors = [];

const chromeCssPath = resolve(dist, 'chrome.css');
if (!existsSync(chromeCssPath) || readFileSync(chromeCssPath, 'utf-8').trim().length === 0) {
  errors.push('dist/chrome.css is missing or empty — did build:css run?');
}

const cssPath = resolve(dist, 'tailwind.css');
if (!existsSync(cssPath) || readFileSync(cssPath, 'utf-8').trim().length === 0) {
  errors.push('dist/tailwind.css is missing or empty — did build:css run?');
}

const readerCssPath = resolve(dist, 'bible-reader.css');
if (!existsSync(readerCssPath) || readFileSync(readerCssPath, 'utf-8').trim().length === 0) {
  errors.push('dist/bible-reader.css is missing or empty — did build:css run?');
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
}

if (errors.length > 0) {
  console.error('❌ Style verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('✅ Style verification passed');
