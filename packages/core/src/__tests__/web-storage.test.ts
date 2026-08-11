import { describe, it, expect, afterEach } from 'vitest';
import {
  clearStorage,
  getLocalStorage,
  getSessionStorage,
  removeStorageItem,
  setStorageItem,
} from '../web-storage';

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

/**
 * Safari's private mode hands out a readable store with a zero-byte quota, so a
 * store can pass the `getItem` capability check and still throw on every write.
 */
function writeThrowingStore(): Storage {
  const store = fakeStore();
  const reject = () => {
    throw new Error('QuotaExceededError');
  };
  return { ...store, setItem: reject, removeItem: reject, clear: reject } as Storage;
}

describe('mutation helpers', () => {
  it('report a successful write and persist the value', () => {
    const store = fakeStore();

    expect(setStorageItem(store, 'key', 'value')).toBe(true);
    expect(store.getItem('key')).toBe('value');
  });

  it('report failure instead of throwing when the store rejects the write', () => {
    expect(setStorageItem(writeThrowingStore(), 'key', 'value')).toBe(false);
  });

  it('report failure when there is no store at all', () => {
    expect(setStorageItem(null, 'key', 'value')).toBe(false);
  });

  it('swallow a rejected removal so cleanup can never fail its caller', () => {
    expect(() => removeStorageItem(writeThrowingStore(), 'key')).not.toThrow();
    expect(() => removeStorageItem(null, 'key')).not.toThrow();
  });

  it('swallow a rejected clear', () => {
    expect(() => clearStorage(writeThrowingStore())).not.toThrow();
    expect(() => clearStorage(null)).not.toThrow();
  });

  it('removes and clears through a working store', () => {
    const store = fakeStore();
    store.setItem('a', '1');
    store.setItem('b', '2');

    removeStorageItem(store, 'a');
    expect(store.getItem('a')).toBeNull();

    clearStorage(store);
    expect(store.length).toBe(0);
  });
});
