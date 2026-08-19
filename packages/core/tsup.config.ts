import { defineConfig } from 'tsup';

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
  entry: ['src/index.ts', 'src/browser.ts', 'src/server.ts'],
  format: ['cjs', 'esm'],
  dts: false, // TypeScript 7 has no compiler API; tsc emits .d.ts (see ADR 0005)
  // Keep Node-only peer out of published bundles; loaded at runtime on server.
  external: ['jsdom'],
  env: {
    YVP_PUBLISH_BUILD: isPublishBuild ? 'true' : '',
  },
});
