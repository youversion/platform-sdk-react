import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, './package.json'), 'utf8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  define: {
    SDK_VERSION: JSON.stringify(pkg.version),
  },
});
