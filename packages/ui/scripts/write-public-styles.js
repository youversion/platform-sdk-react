// Manual `styles.css` is the full sheet. JS injects chrome / utilities / reader
// as separate strings so a Provider-only import stays small.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
writeFileSync(
  resolve(dist, 'styles.css'),
  readFileSync(resolve(dist, 'tailwind.css'), 'utf8') +
    readFileSync(resolve(dist, 'bible-reader.css'), 'utf8'),
);
