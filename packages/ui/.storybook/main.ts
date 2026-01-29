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
    /**
     * Pre-optimize dependencies to prevent Vite from reloading mid-test in CI.
     * Without this, Vite discovers dependencies during test execution and triggers
     * a reload, which breaks the Vitest runner and causes "sb-preparing-story" failures.
     * @see https://github.com/storybookjs/storybook/issues/33067
     * @see https://github.com/storybookjs/storybook/issues/32049
     */
    config.optimizeDeps = {
      ...config.optimizeDeps,
      include: [
        ...(config.optimizeDeps?.include ?? []),
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@radix-ui/react-popover',
        '@radix-ui/react-use-controllable-state',
      ],
    };
    return config;
  },
};
export default config;
