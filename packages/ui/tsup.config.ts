import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: false,
  splitting: false,
  injectStyle: false,
  clean: process.env.NODE_ENV === 'production',
  format: ['esm', 'cjs'],
  target: 'es2020',
  // Always bundle workspace packages to avoid resolution issues
  noExternal: ['@youversion/platform-core'],
  // Consumers provide these:
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  dts: false, // types come from `tsc` + API Extractor
  // Watch the workspace dependencies for changes
  // eslint-disable-next-line @typescript-eslint/require-await
  onSuccess: async () => {
    console.log('React SDK build completed');
  },
});
