#!/usr/bin/env node
/**
 * Publish minified copies of src/styles/*.css to dist/styles.
 * Source stays readable. The public specifier is unchanged:
 * `@youversion/platform-core/browser/styles/*`.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const stylesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles');
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'styles');

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim();
}

mkdirSync(outDir, { recursive: true });
const files = readdirSync(stylesDir).filter((name) => name.endsWith('.css'));
if (files.length === 0) {
  throw new Error('minify-browser-css: no CSS files in src/styles');
}
for (const name of files) {
  const minified = minifyCss(readFileSync(join(stylesDir, name), 'utf8'));
  if (!minified) {
    throw new Error(`minify-browser-css: ${name} minified to empty`);
  }
  writeFileSync(join(outDir, name), `${minified}\n`);
}

const reader = readFileSync(join(outDir, 'bible-reader.css'), 'utf8');
if (!reader.includes('--yv-reader-font-size') || !reader.includes('yv-bible-renderer')) {
  throw new Error('minify-browser-css: bible-reader.css lost required markers');
}
const theme = readFileSync(join(outDir, 'theme.css'), 'utf8');
if (!theme.includes('--yv-red') || !theme.includes("@import './preflight.css'")) {
  throw new Error('minify-browser-css: theme.css lost required markers');
}
