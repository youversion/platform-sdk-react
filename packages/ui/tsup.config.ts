import { defineConfig } from 'tsup';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  sourcemap: false,
  splitting: false,
  clean: process.env.NODE_ENV === 'production',
  injectStyle: false,
  loader: {
    '.css': 'text',
  },
  format: ['esm', 'cjs'],
  target: 'es2020',
  // Always bundle workspace packages to avoid resolution issues
  noExternal: ['@youversion/platform-core'],
  // Consumers provide these:
  external: ['react', 'react/jsx-runtime', 'react-dom', 'i18next', 'react-i18next'],
  dts: false, // types come from `tsc` + API Extractor
  // Embed built Tailwind CSS as a global constant for runtime injection
  // Users don't need to manually import the CSS file
  define: (() => {
    const cssPath = resolve(__dirname, 'dist/tailwind.css');
    if (!existsSync(cssPath)) {
      console.warn(`Warning: ${cssPath} not found. Styles will be empty.`);
      return { __YV_STYLES__: '""' };
    }
    return { __YV_STYLES__: JSON.stringify(readFileSync(cssPath, 'utf-8')) };
  })(),
  onSuccess: () => {
    console.log('React SDK build completed');
  },
});
