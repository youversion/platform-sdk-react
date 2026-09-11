import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/test-utils.tsx'],
  format: ['cjs', 'esm'],
  dts: false,
  treeshake: true,
  external: ['jsdom'],
  // Apply whitespace-only minification; preserve syntax and identifiers.
  esbuildOptions(options) {
    options.minifyWhitespace = true;
    options.minifySyntax = false;
    options.minifyIdentifiers = false;
  },
});
