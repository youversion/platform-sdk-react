import { promises as fs } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.cwd(), 'dist');
const src = path.join(dist, 'index.rollup.d.ts');
const dst = path.join(dist, 'index.d.ts');

const content = await fs.readFile(src, 'utf8');
const bad = content.match(/shared-(core|ui)|^\.\.\/\.\./m);
if (bad) {
  console.error('Rolled up d.ts still references internal modules:', bad[0]);
  process.exit(1);
}
await fs.writeFile(dst, content);
