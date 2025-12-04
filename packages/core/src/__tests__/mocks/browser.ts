import { vi } from 'vitest';

/**
 * Creates a mock window.location object for testing
 */
export const createMockLocation = (): { href: string; search: string } => ({
  href: '',
  search: '',
});

/**
 * Creates a mock window.history object for testing
 */
export const createMockHistory = (): { replaceState: ReturnType<typeof vi.fn> } => ({
  replaceState: vi.fn(),
});

/**
 * Creates a mock window object for testing
 */
export const createMockWindow = (): {
  location: ReturnType<typeof createMockLocation>;
  history: ReturnType<typeof createMockHistory>;
} => ({
  location: createMockLocation(),
  history: createMockHistory(),
});

/**
 * Creates a mock localStorage object for testing
 */
export const createMockLocalStorage = (): {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
} => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

/**
 * Creates a mock crypto API for testing
 */
export const createMockCrypto = (): {
  getRandomValues: ReturnType<typeof vi.fn>;
  randomUUID: ReturnType<typeof vi.fn>;
  subtle: { digest: ReturnType<typeof vi.fn> };
} => ({
  getRandomValues: vi.fn(),
  randomUUID: vi.fn(() => 'test-installation-id-123'),
  subtle: {
    digest: vi.fn(),
  },
});

/**
 * Sets up all browser-related mocks for testing
 * @returns Object containing references to all created mocks
 */
export const setupBrowserMocks = (): {
  window: ReturnType<typeof createMockWindow>;
  localStorage: ReturnType<typeof createMockLocalStorage>;
  crypto: ReturnType<typeof createMockCrypto>;
  btoa: ReturnType<typeof vi.fn>;
  atob: ReturnType<typeof vi.fn>;
} => {
  const window = createMockWindow();
  const localStorage = createMockLocalStorage();
  const crypto = createMockCrypto();
  const btoa = vi.fn();
  const atob = vi.fn();

  vi.stubGlobal('window', window);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('crypto', crypto);
  vi.stubGlobal('btoa', btoa);
  vi.stubGlobal('atob', atob);

  return { window, localStorage, crypto, btoa, atob };
};

/**
 * Cleans up all browser-related mocks
 */
export const cleanupBrowserMocks = (): void => {
  vi.unstubAllGlobals();
};
