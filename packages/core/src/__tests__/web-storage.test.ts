import { describe, it, expect, afterEach } from 'vitest';
import { getLocalStorage, getSessionStorage } from '../web-storage';

type StorageName = 'localStorage' | 'sessionStorage';

const restorers: (() => void)[] = [];

/**
 * Replaces `target[name]` with `read` (a getter, so the test can simulate a
 * property access that itself throws) and registers the undo.
 */
function stubStorage(target: object, name: StorageName, read: () => unknown): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  restorers.push(() => {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else delete (target as Record<string, unknown>)[name];
  });
  Object.defineProperty(target, name, { configurable: true, get: read });
}

function fakeStore(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

afterEach(() => {
  while (restorers.length) restorers.pop()!();
});

describe.each([
  { name: 'localStorage' as const, get: getLocalStorage },
  { name: 'sessionStorage' as const, get: getSessionStorage },
])('$name', ({ name, get }) => {
  it('returns the store when the global is usable', () => {
    const store = fakeStore();
    stubStorage(globalThis, name, () => store);

    expect(get()).toBe(store);
  });

  it('returns null when the global is undefined (Node without --localstorage-file)', () => {
    stubStorage(globalThis, name, () => undefined);

    expect(get()).toBeNull();
  });

  it('returns null when the global is null (Android DOM WebView)', () => {
    stubStorage(globalThis, name, () => null);

    expect(get()).toBeNull();
  });

  it('returns null when reading the property throws (SecurityError)', () => {
    stubStorage(globalThis, name, () => {
      throw new Error('SecurityError: storage is disabled');
    });

    expect(get()).toBeNull();
  });

  it('returns null when the value is not a Storage (no getItem)', () => {
    stubStorage(globalThis, name, () => ({}));

    expect(get()).toBeNull();
  });

  it('returns null when `window` exists without storage (React Native)', () => {
    // In React Native `global.window === global`, so `typeof window` passes
    // while no storage exists on it.
    stubStorage(globalThis, name, () => undefined);
    stubStorage(globalThis, 'window' as StorageName, () => globalThis);

    expect(get()).toBeNull();
  });

  it('prefers the window store when it disagrees with the global accessor', () => {
    const windowStore = fakeStore();
    stubStorage(globalThis, name, () => undefined);
    stubStorage(globalThis, 'window' as StorageName, () => ({ [name]: windowStore }));

    expect(get()).toBe(windowStore);
  });

  it('falls back to the global accessor when window has no usable store', () => {
    const globalStore = fakeStore();
    stubStorage(globalThis, name, () => globalStore);
    stubStorage(globalThis, 'window' as StorageName, () => ({ [name]: undefined }));

    expect(get()).toBe(globalStore);
  });
});
