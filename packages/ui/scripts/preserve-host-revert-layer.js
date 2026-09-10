// lightningcss drops `-webkit-appearance` from the A2 rule on minify. Put it back.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

for (const file of ['tailwind.css', 'chrome.css']) {
  const cssPath = resolve(dist, file);
  const css = readFileSync(cssPath, 'utf8');
  if (!css.includes('appearance:revert-layer')) {
    continue;
  }
  if (css.includes('-webkit-appearance:revert-layer')) {
    continue;
  }
  writeFileSync(
    cssPath,
    css.replaceAll(
      'appearance:revert-layer',
      'appearance:revert-layer;-webkit-appearance:revert-layer',
    ),
  );
}
