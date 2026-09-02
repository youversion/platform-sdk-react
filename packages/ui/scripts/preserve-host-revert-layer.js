// lightningcss drops `-webkit-appearance` from the A2 rule on minify. Put it back.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'tailwind.css');
const css = readFileSync(cssPath, 'utf8');

if (!css.includes('appearance:revert-layer')) {
  process.exit(0);
}

if (css.includes('-webkit-appearance:revert-layer')) {
  process.exit(0);
}

writeFileSync(
  cssPath,
  css.replaceAll(
    'appearance:revert-layer',
    'appearance:revert-layer;-webkit-appearance:revert-layer',
  ),
);
