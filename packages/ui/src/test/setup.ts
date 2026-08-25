// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Node >= 22 defines its own experimental `localStorage` global that evaluates
// to `undefined` unless the process was started with `--localstorage-file` —
// and vitest's jsdom environment does not overwrite an accessor that already
// exists on `globalThis`, so Node's dead getter shadows jsdom's working
// storage. Pointing `--localstorage-file` at a real file is worse: one
// file-backed store shared by every parallel worker, so tests pollute each
// other. Instead, graft a coherent Web Storage trio from a private JSDOM
// window: fresh per test file (isolation), and `Storage` is replaced alongside
// the instances so `vi.spyOn(Storage.prototype, …)` still observes real
// storage traffic — tests that assert "nothing was persisted" keep their
// teeth. Skipped in `node`-environment tests, which must stay storage-less.
if (globalThis.document && !(globalThis.localStorage?.getItem instanceof Function)) {
  const { JSDOM } = await import('jsdom');
  const storageWindow = new JSDOM('', { url: 'http://localhost/' }).window;
  Object.defineProperty(globalThis, 'Storage', {
    value: storageWindow.Storage,
    configurable: true,
    writable: true,
  });
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      value: storageWindow[name],
      configurable: true,
      writable: true,
    });
  }
}

// jsdom does not implement scrollIntoView. Chapter picker calls it on open.
Element.prototype.scrollIntoView = function scrollIntoView(): void {};

// Clean up after each test
afterEach(() => {
  cleanup();
});
