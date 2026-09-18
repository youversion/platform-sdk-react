import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const rootEnvPath = path.resolve(__dirname, '../..', '.env');
  const rootEnv = existsSync(rootEnvPath) ? parseEnv(readFileSync(rootEnvPath, 'utf8')) : {};
  const packageEnv = loadEnv(mode, __dirname, 'VITE_');
  const exposedEnv = {
    ...Object.fromEntries(Object.entries(rootEnv).filter(([name]) => name.startsWith('VITE_'))),
    ...packageEnv,
    // Explicit prefixed or generic process variables win, then legacy package-local
    // values, then the root .env fallback.
    VITE_YVP_APP_KEY:
      process.env.VITE_YVP_APP_KEY ??
      process.env.YVP_APP_KEY ??
      packageEnv.VITE_YVP_APP_KEY ??
      rootEnv.VITE_YVP_APP_KEY ??
      rootEnv.YVP_APP_KEY,
    VITE_YVP_API_HOST:
      process.env.VITE_YVP_API_HOST ??
      process.env.YVP_API_HOST ??
      packageEnv.VITE_YVP_API_HOST ??
      rootEnv.VITE_YVP_API_HOST ??
      rootEnv.YVP_API_HOST,
  };
  const definedEnv = Object.fromEntries(
    Object.entries(exposedEnv)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)]),
  );

  return {
    base: process.env.VITE_BASE_PATH ?? '/',
    define: definedEnv,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
