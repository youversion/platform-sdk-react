import type { StorybookConfig } from '@storybook/react-vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { parseEnv } from 'util';
import { loadEnv } from 'vite';

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
    const rootEnvPath = resolve(__dirname, '../../..', '.env');
    const rootEnv = existsSync(rootEnvPath) ? parseEnv(readFileSync(rootEnvPath, 'utf8')) : {};
    const packageEnv = loadEnv(
      config.mode ?? 'development',
      resolve(__dirname, '..'),
      'STORYBOOK_',
    );
    const exposedEnv = {
      ...Object.fromEntries(
        Object.entries(rootEnv).filter(([name]) => name.startsWith('STORYBOOK_')),
      ),
      ...packageEnv,
      // Explicit prefixed or generic process variables win, then legacy package-local
      // values, then the root .env fallback.
      STORYBOOK_YOUVERSION_APP_KEY:
        process.env.STORYBOOK_YOUVERSION_APP_KEY ??
        process.env.YVP_APP_KEY ??
        packageEnv.STORYBOOK_YOUVERSION_APP_KEY ??
        rootEnv.STORYBOOK_YOUVERSION_APP_KEY ??
        rootEnv.YVP_APP_KEY,
      STORYBOOK_YOUVERSION_API_HOST:
        process.env.STORYBOOK_YOUVERSION_API_HOST ??
        process.env.YVP_API_HOST ??
        packageEnv.STORYBOOK_YOUVERSION_API_HOST ??
        rootEnv.STORYBOOK_YOUVERSION_API_HOST ??
        rootEnv.YVP_API_HOST,
    };
    const definedEnv = Object.fromEntries(
      Object.entries(exposedEnv)
        .filter((entry): entry is [string, string] => entry[1] !== undefined)
        .map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)]),
    );

    config.define = { ...config.define, ...definedEnv, __YV_STYLES__: yvStyles };
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
