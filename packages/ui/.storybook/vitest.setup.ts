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

// React's precedence stylesheet resource rejects with the browser's generic
// load Event when the optional Fonts API sheet is unavailable. Firefox exposes
// that expected asset failure as an unhandled rejection; keep it from masking
// the story assertions while leaving non-Event rejections visible to Vitest.
globalThis.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof Event) event.preventDefault();
});

beforeEach(() => {
  localStorage?.clear?.();
  sessionStorage?.clear?.();
});
