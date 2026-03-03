import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    env: { TZ: 'UTC' },
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    mockReset: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
