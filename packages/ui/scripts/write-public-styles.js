// Manual `styles.css` is the full sheet. JS injects chrome / utilities / reader
// as separate strings so a Provider-only import stays small.
import { mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const inputs = ['tailwind.css', 'bible-reader.css'];

function writePublicStyles() {
  try {
    writeFileSync(
      resolve(dist, 'styles.css'),
      inputs.map((file) => readFileSync(resolve(dist, file), 'utf8')).join(''),
    );
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

mkdirSync(dist, { recursive: true });
writePublicStyles();

if (process.argv.includes('--watch')) {
  let pending;
  watch(dist, (_event, file) => {
    if (!file || !inputs.includes(file)) return;
    clearTimeout(pending);
    pending = setTimeout(writePublicStyles, 25);
  });
}
