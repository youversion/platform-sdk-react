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
  // Always bundle workspace packages to avoid resolution issues.
  // This inlines core's *dist*, so the `X-YVP-Sdk` version constant core baked in
  // at its own build time is the one we ship — this build never computes it. That
  // is why `prepublishOnly` rebuilds core with `YVP_PUBLISH_BUILD=true` before
  // building here, and why the env var is scoped to that command alone. See
  // packages/core/tsup.config.ts.
  noExternal: ['@youversion/platform-core'],
  // Consumers provide these. jsdom is Node-only (optional peer of platform-core);
  // never inline it into the UI browser bundle.
  external: ['react', 'react/jsx-runtime', 'react-dom', 'jsdom'],
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
