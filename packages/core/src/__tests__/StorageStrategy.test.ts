/**
 * @vitest-environment jsdom
 */
import { expect, it, vi } from 'vitest';
import { MemoryStorageStrategy, SessionStorageStrategy } from '../StorageStrategy';

it('persists, replaces, removes, and clears session values', () => {
  sessionStorage.clear();
  const storage = new SessionStorageStrategy();

  storage.setItem('first', 'one');
  storage.setItem('first', 'updated');
  storage.setItem('second', 'two');
  expect(storage.getItem('first')).toBe('updated');

  storage.removeItem('first');
  expect(storage.getItem('first')).toBeNull();
  expect(storage.getItem('second')).toBe('two');

  storage.clear();
  expect(storage.getItem('second')).toBeNull();
});

it('degrades safely when sessionStorage is unavailable', () => {
  vi.stubGlobal('sessionStorage', undefined);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const storage = new SessionStorageStrategy();

  expect(() => storage.setItem('key', 'value')).not.toThrow();
  expect(storage.getItem('key')).toBeNull();
  expect(() => storage.removeItem('key')).not.toThrow();
  expect(() => storage.clear()).not.toThrow();
  expect(warning).toHaveBeenCalledWith('SessionStorage is not available in this environment');

  warning.mockRestore();
  vi.unstubAllGlobals();
});

it('keeps memory stores isolated and implements the complete storage lifecycle', () => {
  const first = new MemoryStorageStrategy();
  const second = new MemoryStorageStrategy();

  first.setItem('key', 'first');
  second.setItem('key', 'second');
  expect(first.getItem('key')).toBe('first');
  expect(second.getItem('key')).toBe('second');

  first.removeItem('key');
  expect(first.getItem('key')).toBeNull();
  expect(second.getItem('key')).toBe('second');

  second.clear();
  expect(second.getItem('key')).toBeNull();
});
