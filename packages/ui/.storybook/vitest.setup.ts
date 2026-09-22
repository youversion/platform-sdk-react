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

function isExpectedFontStylesheetRejection(reason: unknown): boolean {
  if (!(reason instanceof Event)) return false;
  const target = reason.target;
  return (
    target instanceof HTMLLinkElement &&
    target.rel === 'stylesheet' &&
    target.href.includes('/v1/fonts/1/stylesheet?app_key=')
  );
}

// React's precedence stylesheet resource rejects with the browser's generic
// load Event when the optional Fonts API sheet is unavailable. Firefox exposes
// that expected asset failure as an unhandled rejection; keep only that known
// request from masking the story assertions.
globalThis.addEventListener('unhandledrejection', (event) => {
  if (isExpectedFontStylesheetRejection(event.reason)) event.preventDefault();
});

beforeEach(() => {
  localStorage?.clear?.();
  sessionStorage?.clear?.();
});
