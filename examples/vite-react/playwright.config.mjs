import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  use: { baseURL: 'http://127.0.0.1:5178', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm dev --mode e2e --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
  },
});
