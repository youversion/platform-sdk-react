import { defineConfig, defineProject } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    passWithNoTests: true,
    projects: [
      // Unit tests project
      defineProject({
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: './src/test/setup.ts',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['**/*.stories.{ts,tsx}', 'node_modules/**'],
        },
      }),
      // Storybook integration tests project
      defineProject({
        plugins: [
          storybookTest({
            // The location of your Storybook config, main.js|ts
            configDir: path.join(dirname, '.storybook'),
            // This should match your package.json script to run Storybook
            // The --ci flag will skip prompts and not open a browser
            storybookScript: 'pnpm storybook --no-open',
            tags: { include: ['integration'] },
          }),
        ],
        test: {
          name: 'storybook',
          // Enable browser mode
          browser: {
            enabled: true,
            // Make sure to install Playwright
            provider: playwright({}),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      }),
    ],
  },
});
