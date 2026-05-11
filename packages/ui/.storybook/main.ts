import type { StorybookConfig } from '@storybook/react-vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-vitest',
    { name: '@storybook/addon-coverage', options: { istanbul: { include: ['**/stories/**'] } } },
  ],
  framework: '@storybook/react-vite',
  staticDirs: ['../public'], // This is for Storybook mock service worker
  viteFinal: (config) => {
    // __YV_STYLES__ is normally injected by tsup at build time (see tsup.config.ts).
    // Storybook uses its own Vite server, so we define it as empty here — CSS is
    // already loaded via `import '../dist/tailwind.css'` in preview.tsx.
    config.define = { ...config.define, __YV_STYLES__: '""' };
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        /**
         * Resolve the absolute path of the @ package to the src directory.
         * This is needed for monorepo projects.
         */
        '@': resolve(dirname(fileURLToPath(import.meta.url)), '../src'),
      },
    };
    /**
     * Watch the dist folder for CSS changes when Tailwind rebuilds.
     * This allows Storybook to pick up the changes without having to restart the server.
     */
    config.server = {
      ...config.server,
      watch: {
        ...config.server?.watch,
        ignored: [
          ...(Array.isArray(config.server?.watch?.ignored)
            ? config.server.watch.ignored
            : config.server?.watch?.ignored
              ? [config.server.watch.ignored]
              : []),
          '!**/dist/**/*.css',
        ],
      },
    };
    return config;
  },
};
export default config;
