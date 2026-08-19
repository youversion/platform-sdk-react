import { describe, it, expect, afterEach } from 'vitest';
import {
  clearStorage,
  getLocalStorage,
  getSessionStorage,
  removeStorageItem,
  setStorageItem,
} from '../web-storage';

type StorageName = 'localStorage' | 'sessionStorage';

type WindowWithStorage = {
  localStorage?: Storage | null;
  sessionStorage?: Storage | null;
};

const restorers: (() => void)[] = [];

class MemoryWebStorage implements Storage {
  #entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#entries.set(key, value);
  }

  removeItem(key: string): void {
    this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  get length(): number {
    return this.#entries.size;
  }
}

/**
 * Replaces a global storage area with `read` (a getter, so the test can
 * simulate a property access that itself throws) and registers the undo.
 */
type MissingGetItem = {
  getItem?: undefined;
};

function stubStorageArea(
  name: StorageName,
  read: () => Storage | MissingGetItem | null | undefined,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  restorers.push(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  });
  Object.defineProperty(globalThis, name, { configurable: true, get: read });
}

function stubWindow(read: () => WindowWithStorage | typeof globalThis): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  restorers.push(() => {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, get: read });
}

function fakeStore(): Storage {
  return new MemoryWebStorage();
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
    stubStorageArea(name, () => store);

    expect(get()).toBe(store);
  });

  it('returns null when the global is undefined (Node without --localstorage-file)', () => {
    stubStorageArea(name, () => undefined);

    expect(get()).toBeNull();
  });

  it('returns null when the global is null (Android DOM WebView)', () => {
    stubStorageArea(name, () => null);

    expect(get()).toBeNull();
  });

  it('returns null when reading the property throws (SecurityError)', () => {
    stubStorageArea(name, () => {
      throw new Error('SecurityError: storage is disabled');
    });

    expect(get()).toBeNull();
  });

  it('returns null when the value is not a Storage (no getItem)', () => {
    stubStorageArea(name, () => ({}));

    expect(get()).toBeNull();
  });

  it('returns null when `window` exists without storage (React Native)', () => {
    // In React Native `global.window === global`, so `typeof window` passes
    // while no storage exists on it.
    stubStorageArea(name, () => undefined);
    stubWindow(() => globalThis);

    expect(get()).toBeNull();
  });

  it('prefers the window store when it disagrees with the global accessor', () => {
    const windowStore = fakeStore();
    stubStorageArea(name, () => undefined);
    stubWindow(() => ({ [name]: windowStore }));

    expect(get()).toBe(windowStore);
  });

  it('falls back to the global accessor when window has no usable store', () => {
    const globalStore = fakeStore();
    stubStorageArea(name, () => globalStore);
    stubWindow(() => ({ [name]: undefined }));

    expect(get()).toBe(globalStore);
  });
});

/**
 * Safari's private mode hands out a readable store with a zero-byte quota, so a
 * store can pass the `getItem` capability check and still throw on every write.
 */
function writeThrowingStore(): Storage {
  const store = new MemoryWebStorage();
  const reject = (): never => {
    throw new Error('QuotaExceededError');
  };
  store.setItem = reject;
  store.removeItem = reject;
  store.clear = reject;
  return store;
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
