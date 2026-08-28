// Vitest setup file
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { graftTestWebStorage } from '@youversion/platform-react-hooks/test-utils';
import '@testing-library/jest-dom/vitest';

// Node's experimental `localStorage` global shadows jsdom's working storage;
// the graft (shared with the hooks package) swaps in a coherent Web Storage
// trio per test file. No-op in `node`-environment tests.
await graftTestWebStorage();

// jsdom does not implement scrollIntoView. Chapter picker calls it on open.
Element.prototype.scrollIntoView = function scrollIntoView(): void {};

beforeEach(() => {
  // Permission state is app-scoped in production. Unit-test wrappers that use
  // the raw contexts (instead of mounting YouVersionProvider) still need an
  // app identity for permission reads and writes.
  YouVersionPlatformConfiguration.appKey = 'test-app-key';
});

// Clean up after each test
afterEach(() => {
  cleanup();
  YouVersionPlatformConfiguration.appKey = null;
});
