// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrollIntoView. Chapter picker calls it on open.
Element.prototype.scrollIntoView = function scrollIntoView(): void {};

// Clean up after each test
afterEach(() => {
  cleanup();
});
