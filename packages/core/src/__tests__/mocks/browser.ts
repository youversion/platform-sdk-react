import { vi } from 'vitest';

type MockLocation = {
  href: string;
  search: string;
};

type MockHistory = {
  replaceState: ReturnType<typeof vi.fn>;
};

type MockWindow = {
  location: MockLocation;
  history: MockHistory;
};

type MockLocalStorage = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

type MockCrypto = {
  getRandomValues: ReturnType<typeof vi.fn>;
  randomUUID: ReturnType<typeof vi.fn>;
  subtle: { digest: ReturnType<typeof vi.fn> };
};

type BrowserMocks = {
  window: MockWindow;
  localStorage: MockLocalStorage;
  crypto: MockCrypto;
  btoa: ReturnType<typeof vi.fn>;
  atob: ReturnType<typeof vi.fn>;
};

export const createMockLocation = (): MockLocation => ({
  href: '',
  search: '',
});

export const createMockHistory = (): MockHistory => ({
  replaceState: vi.fn(),
});

export const createMockWindow = (): MockWindow => ({
  location: createMockLocation(),
  history: createMockHistory(),
});

export const createMockLocalStorage = (): MockLocalStorage => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

export const createMockCrypto = (): MockCrypto => ({
  getRandomValues: vi.fn(),
  randomUUID: vi.fn(() => 'test-installation-id-123'),
  subtle: {
    digest: vi.fn(),
  },
});

export const setupBrowserMocks = (): BrowserMocks => {
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

export const cleanupBrowserMocks = (): void => {
  vi.unstubAllGlobals();
};
