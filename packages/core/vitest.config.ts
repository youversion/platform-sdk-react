import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const packageVersion = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
).version as string;

export default defineConfig({
  define: {
    __SDK_PACKAGE_VERSION__: JSON.stringify(packageVersion),
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/polyfills.ts', './src/__tests__/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});
