import { defineConfig } from 'tsup';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const useClientDirective = "'use client';\n";
const serverCompatibleEntries = new Set([
  resolve(__dirname, 'dist/index.js'),
  resolve(__dirname, 'dist/index.cjs'),
]);

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/components/YouVersionProvider.tsx',
    'src/components/bible-reader.tsx',
    'src/components/bible-chapter-picker.tsx',
    'src/components/bible-version-picker.tsx',
    'src/components/YouVersionAuthButton.tsx',
    'src/components/verse-of-the-day.tsx',
    'src/components/verse.tsx',
    'src/components/verse-action-popover.tsx',
    'src/components/bible-card.tsx',
    'src/components/profile-avatar.tsx',
    'src/components/ui/separator.tsx',
    'src/components/ui/textarea.tsx',
  ],
  sourcemap: false,
  splitting: true,
  treeshake: true,
  // The UI build script empties dist before CSS. tsup must not delete
  // those CSS files after that, or the style defines are empty.
  clean: false,
  injectStyle: false,
  loader: {
    '.css': 'text',
  },
  format: ['esm', 'cjs'],
  // Rollup strips module-level directives. Restore the client boundary on
  // component entries and their chunks after the final bundling pass. The
  // package root also exports server-safe core values, so it stays unmarked.
  plugins: [
    {
      name: 'restore-use-client-directives',
      buildEnd({ writtenFiles }) {
        for (const { name } of writtenFiles) {
          if (!/\.(js|cjs)$/.test(name)) continue;
          if (serverCompatibleEntries.has(resolve(name))) continue;
          const source = readFileSync(name, 'utf8');
          if (!source.startsWith(useClientDirective)) {
            writeFileSync(name, useClientDirective + source);
          }
        }
      },
    },
  ],
  target: 'es2020',
  // Core stays a runtime dependency so UI and hooks share one copy. The
  // X-YVP-Sdk stamp lives in published core (core `prepublishOnly`). Inlining
  // all of core duplicated Configuration + zod in the partner graph.
  // Consumers provide these. jsdom is Node-only (optional peer of platform-core);
  // never inline it into the UI browser bundle.
  external: ['react', 'react/jsx-runtime', 'react-dom', 'jsdom', '@youversion/platform-core'],
  dts: false, // types come from `tsc` + API Extractor
  // Whitespace only. Syntax/identifier minify would change the core stamp
  // shape if anyone later inlines core, and it is not needed for size-limit.
  esbuildOptions(options) {
    options.minifyWhitespace = true;
    options.minifySyntax = false;
    options.minifyIdentifiers = false;
  },
  // Embed built Tailwind CSS as a global constant for runtime injection
  // Users don't need to manually import the CSS file
  define: (() => {
    const embed = (file: string, name: string) => {
      const cssPath = resolve(__dirname, file);
      if (!existsSync(cssPath)) {
        console.warn(`Warning: ${cssPath} not found. ${name} will be empty.`);
        return '""';
      }
      return JSON.stringify(readFileSync(cssPath, 'utf-8').replace(/\/\*\![\s\S]*?\*\//g, ''));
    };
    return {
      __YV_STYLES__: embed('dist/chrome.css', '__YV_STYLES__'),
      __YV_COMPONENT_STYLES__: embed('dist/tailwind.css', '__YV_COMPONENT_STYLES__'),
      __YV_READER_STYLES__: embed('dist/bible-reader.css', '__YV_READER_STYLES__'),
    };
  })(),
  onSuccess: () => {
    console.log('React SDK build completed');
  },
});
