// Re-run preserve-host-revert-layer after Tailwind watch rewrites dist CSS.
// lightningcss drops `-webkit-appearance` on minify; the one-shot build:css
// pipeline puts it back, but `tailwindcss --watch` does not.
import { spawnSync } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const dist = resolve(scriptsDir, '..', 'dist');
const preserve = resolve(scriptsDir, 'preserve-host-revert-layer.js');

const targets = new Set(['chrome.css', 'tailwind.css']);
let timer = null;

function runPreserve() {
  spawnSync(process.execPath, [preserve], { stdio: 'inherit' });
}

watch(dist, { persistent: true }, (_event, filename) => {
  if (!filename || !targets.has(filename)) return;
  clearTimeout(timer);
  timer = setTimeout(runPreserve, 50);
});
