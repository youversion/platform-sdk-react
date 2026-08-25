import type { StorybookConfig } from '@storybook/react-vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
// local compile helper; types live next to the file and are not part of the public API
// @ts-expect-error -- TypeScript 7 does not load a sibling .mjs.d.ts for this specifier
import { stylexVitePlugin } from '../scripts/stylex-vite-plugin.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function embedCss(cssPath: string): string {
  return existsSync(cssPath) ? JSON.stringify(readFileSync(cssPath, 'utf-8')) : '""';
}

// Embed real CSS into the constructable-stylesheet constants — same pattern as tsup.
const yvStyles = embedCss(resolve(__dirname, '../dist/tailwind.css'));
const yvStylex = embedCss(resolve(__dirname, '../src/styles/stylex.generated.css'));

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
    config.define = {
      ...config.define,
      __YV_STYLES__: yvStyles,
      __YV_STYLEX_STYLES__: yvStylex,
    };
    config.plugins = [...(config.plugins ?? []), stylexVitePlugin()];
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
