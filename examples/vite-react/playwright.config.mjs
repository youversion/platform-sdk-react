import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5178', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm dev --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    env: {
      VITE_YVP_LOCALE: 'en',
      VITE_YVP_APP_KEY: 'browser-test',
      VITE_YVP_API_HOST: 'api.youversion.test',
    },
    reuseExistingServer: false,
  },
});
