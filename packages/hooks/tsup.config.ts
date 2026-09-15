import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { defineConfig } from 'tsup';

const useClientDirective = "'use client';\n";

export default defineConfig({
  entry: ['src/index.ts', 'src/test-utils.tsx'],
  format: ['cjs', 'esm'],
  dts: false,
  treeshake: true,
  external: ['jsdom'],
  // Rollup removes directives from non-entry chunks. Restore only the lazy auth
  // chunk; a global banner would mark every data hook as client-only.
  plugins: [
    {
      name: 'restore-auth-use-client-directive',
      buildEnd({ writtenFiles }) {
        if (this.format !== 'esm') return;

        const authChunk = writtenFiles.find(({ name }) => {
          const fileName = basename(name);
          return fileName.startsWith('YouVersionAuthProvider-') && fileName.endsWith('.js');
        });
        if (!authChunk) throw new Error('YouVersionAuthProvider ESM chunk was not emitted');

        const source = readFileSync(authChunk.name, 'utf8');
        if (!source.startsWith(useClientDirective)) {
          writeFileSync(authChunk.name, useClientDirective + source);
        }
      },
    },
  ],
  // Apply whitespace-only minification; preserve syntax and identifiers.
  esbuildOptions(options) {
    options.minifyWhitespace = true;
    options.minifySyntax = false;
    options.minifyIdentifiers = false;
  },
});
