import { defineConfig } from 'tsup';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { stylexEsbuildPlugin } from './scripts/stylex-esbuild-plugin.mjs';

function embedCss(cssPath: string, label: string): string {
  if (!existsSync(cssPath)) {
    console.warn(`Warning: ${cssPath} not found. ${label} will be empty.`);
    return '""';
  }
  return JSON.stringify(readFileSync(cssPath, 'utf-8'));
}

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
  esbuildPlugins: [stylexEsbuildPlugin()],
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
  // Embed built CSS as global constants for the constructable-stylesheet path.
  define: {
    __YV_STYLES__: embedCss(resolve(__dirname, 'dist/tailwind.css'), 'Tailwind styles'),
    __YV_STYLEX_STYLES__: embedCss(resolve(__dirname, 'dist/stylex.css'), 'StyleX styles'),
  },
  onSuccess: () => {
    console.log('React SDK build completed');
  },
});
