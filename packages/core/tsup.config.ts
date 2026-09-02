import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'tsup';

const packageVersion = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
).version as string;

/**
 * Stamp the `X-YVP-Sdk` version header depending on how the bundle is built.
 *
 * Published builds report the real version (`ReactSDK=2.2.0`); dev, source, and
 * test builds report a `-dev` suffix (`ReactSDK=2.2.0-dev`) so platform
 * telemetry can separate internal YouVersion traffic from published partner
 * traffic. See `src/version.ts`.
 *
 * The package's `prepublishOnly` script sets `YVP_PUBLISH_BUILD=true` so every
 * `npm publish` produces a stamped build; any other build stays `-dev`.
 */
const isPublishBuild = process.env.YVP_PUBLISH_BUILD === 'true';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/browser.ts',
    'src/server.ts',
    'src/client.ts',
    'src/bible.ts',
    'src/languages.ts',
    'src/highlights.ts',
    'src/organizations.ts',
    'src/data-exchange.ts',
    'src/Users.ts',
    'src/YouVersionPlatformConfiguration.ts',
  ],
  format: ['cjs', 'esm'],
  dts: false, // TypeScript 7 has no compiler API; tsc emits .d.ts (see ADR 0005)
  // Named entries keep unused clients off the ApiClient and Provider graphs.
  // Top-level `z.object()` calls are side effects; one barrel file keeps them
  // all. Do not add public subpath exports for these files.
  splitting: true,
  // Keep Node-only peer out of published bundles; loaded at runtime on server.
  external: ['jsdom'],
  env: {
    YVP_PUBLISH_BUILD: isPublishBuild ? 'true' : '',
  },
  define: {
    __SDK_PACKAGE_VERSION__: JSON.stringify(packageVersion),
  },
  // Whitespace only. minifySyntax/minifyIdentifiers and `treeshake: true`
  // fold away `isPublishBuild = true|false` and trip the publish stamp guard.
  esbuildOptions(options) {
    options.minifyWhitespace = true;
    options.minifySyntax = false;
    options.minifyIdentifiers = false;
  },
});
