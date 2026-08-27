// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { graftTestWebStorage } from '@youversion/platform-react-hooks/test-utils';
import '@testing-library/jest-dom/vitest';

// Node's experimental `localStorage` global shadows jsdom's working storage;
// the graft (shared with the hooks package) swaps in a coherent Web Storage
// trio per test file. No-op in `node`-environment tests.
await graftTestWebStorage();

// jsdom does not implement scrollIntoView. Chapter picker calls it on open.
Element.prototype.scrollIntoView = function scrollIntoView(): void {};

// Clean up after each test
afterEach(() => {
  cleanup();
});
