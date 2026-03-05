import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    env: { TZ: 'UTC' }, // Pin to UTC so date-arithmetic tests are timezone-independent
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
      exclude: [
        'src/useInitData.ts',
        'src/useChapterNavigation.ts',
        'src/useVerseSelection.ts',
        'src/context/ReaderContext.tsx',
        'src/context/ReaderProvider.tsx',
        'src/context/VerseSelectionContext.tsx',
        'src/context/VerseSelectionProvider.tsx',
      ],
    },
  },
});
