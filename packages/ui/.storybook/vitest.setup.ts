import { setProjectAnnotations } from '@storybook/react-vite';
import { beforeEach } from 'vitest';
import * as previewAnnotations from './preview';

const _annotations = setProjectAnnotations([previewAnnotations]);

// Play functions assert English copy, and YouVersionProvider syncs the UI to
// navigator.languages on mount. Without this pin, a machine whose browser prefers
// a locale we ship (ko/tr/zh/fr/es) renders that bundle and every text assertion fails.
Object.defineProperty(navigator, 'languages', {
  value: ['en-US', 'en'],
  configurable: true,
});
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true,
});

// Temporary diagnostic: Vitest currently reports some Firefox rejections with
// an empty reason. Log the browser event before Vitest aggregates it so we can
// identify the originating promise without suppressing the failure.
globalThis.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const details =
    reason instanceof Error
      ? `${reason.name}: ${reason.message}\n${reason.stack ?? '<no stack>'}`
      : `${typeof reason}: ${String(reason)}`;
  console.error(`[diagnostic-unhandledrejection] ${details}`);
});

beforeEach(() => {
  localStorage?.clear?.();
  sessionStorage?.clear?.();
});
