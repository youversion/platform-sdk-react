import type { StorybookConfig } from '@storybook/react-vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Embed real CSS into __YV_STYLES__ — same pattern as tsup.config.ts.
// This ensures Storybook tests the actual <YvStyles /> code path with
// real CSS content, not a workaround import.
const cssPath = resolve(__dirname, '../dist/tailwind.css');
const yvStyles = existsSync(cssPath) ? JSON.stringify(readFileSync(cssPath, 'utf-8')) : '""';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-vitest',
    { name: '@storybook/addon-coverage', options: { istanbul: { include: ['**/stories/**'] } } },
  ],
  framework: '@storybook/react-vite',
  // Official Storybook default. Storybook 10.4+ lazy-loads
  // react-docgen-typescript, so this option is enough to keep the
  // TypeScript 7 compiler-API crash off the React preset.
  typescript: {
    reactDocgen: 'react-docgen',
  },
  staticDirs: ['../public'], // This is for Storybook mock service worker
  viteFinal: (config) => {
    config.define = { ...config.define, __YV_STYLES__: yvStyles };
    const existingAlias = config.resolve?.alias;
    const srcAlias = resolve(__dirname, '../src');
    config.resolve = {
      ...config.resolve,
      alias: Array.isArray(existingAlias)
        ? [...existingAlias, { find: '@', replacement: srcAlias }]
        : { ...existingAlias, '@': srcAlias },
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
