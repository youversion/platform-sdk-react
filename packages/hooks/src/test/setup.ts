// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { graftTestWebStorage } from '../test-utils';

// Works around Node >= 22 shadowing jsdom's Web Storage — see the docstring.
await graftTestWebStorage();

// Clean up after each test
afterEach(() => {
  cleanup();
});
