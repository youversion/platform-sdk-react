import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/test-utils.tsx'],
  format: ['cjs', 'esm'],
  dts: false,
  treeshake: true,
  external: ['jsdom'],
  // Whitespace only. Keep identifiers so a future stamp in this graph
  // still matches `scripts/check-sdk-version-stamp.mjs`.
  esbuildOptions(options) {
    options.minifyWhitespace = true;
    options.minifySyntax = false;
    options.minifyIdentifiers = false;
  },
});
