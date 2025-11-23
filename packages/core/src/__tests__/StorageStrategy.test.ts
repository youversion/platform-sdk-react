/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStorageStrategy, MemoryStorageStrategy } from '../StorageStrategy';

describe('SessionStorageStrategy', () => {
  let strategy: SessionStorageStrategy;

  beforeEach(() => {
    strategy = new SessionStorageStrategy();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('setItem', () => {
    it('should store item in sessionStorage', () => {
      strategy.setItem('testKey', 'testValue');

      expect(sessionStorage.getItem('testKey')).toBe('testValue');
    });

    it('should overwrite existing item', () => {
      strategy.setItem('testKey', 'firstValue');
      strategy.setItem('testKey', 'secondValue');

      expect(sessionStorage.getItem('testKey')).toBe('secondValue');
    });

    it('should handle empty string value', () => {
      strategy.setItem('emptyKey', '');

      expect(sessionStorage.getItem('emptyKey')).toBe('');
    });

    it('should handle special characters in key and value', () => {
      const key = 'key-with-special_chars.123';
      const value = 'value with spaces & special chars!';

      strategy.setItem(key, value);

      expect(sessionStorage.getItem(key)).toBe(value);
    });
  });

  describe('getItem', () => {
    it('should retrieve item from sessionStorage', () => {
      sessionStorage.setItem('testKey', 'testValue');

      const result = strategy.getItem('testKey');

      expect(result).toBe('testValue');
    });

    it('should return null for non-existent key', () => {
      const result = strategy.getItem('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should return empty string for empty value', () => {
      sessionStorage.setItem('emptyKey', '');

      const result = strategy.getItem('emptyKey');

      expect(result).toBe('');
    });
  });

  describe('removeItem', () => {
    it('should remove item from sessionStorage', () => {
      sessionStorage.setItem('testKey', 'testValue');

      strategy.removeItem('testKey');

      expect(sessionStorage.getItem('testKey')).toBeNull();
    });

    it('should not throw error when removing non-existent key', () => {
      expect(() => {
        strategy.removeItem('nonExistentKey');
      }).not.toThrow();
    });

    it('should only remove specified key', () => {
      sessionStorage.setItem('key1', 'value1');
      sessionStorage.setItem('key2', 'value2');

      strategy.removeItem('key1');

      expect(sessionStorage.getItem('key1')).toBeNull();
      expect(sessionStorage.getItem('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    it('should clear all items from sessionStorage', () => {
      sessionStorage.setItem('key1', 'value1');
      sessionStorage.setItem('key2', 'value2');
      sessionStorage.setItem('key3', 'value3');

      strategy.clear();

      expect(sessionStorage.length).toBe(0);
      expect(sessionStorage.getItem('key1')).toBeNull();
      expect(sessionStorage.getItem('key2')).toBeNull();
      expect(sessionStorage.getItem('key3')).toBeNull();
    });

    it('should work when sessionStorage is already empty', () => {
      expect(() => {
        strategy.clear();
      }).not.toThrow();

      expect(sessionStorage.length).toBe(0);
    });
  });

  describe('Environment compatibility', () => {
    it('should handle environment without sessionStorage gracefully', () => {
      const originalSessionStorage = global.sessionStorage;
      // @ts-expect-error - Testing undefined sessionStorage
      delete global.sessionStorage;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      const strategy = new SessionStorageStrategy();

      // Should not throw
      expect(() => strategy.setItem('test', 'value')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'SessionStorage is not available in this environment',
      );

      expect(strategy.getItem('test')).toBeNull();
      expect(() => strategy.removeItem('test')).not.toThrow();
      expect(() => strategy.clear()).not.toThrow();

      consoleSpy.mockRestore();
      global.sessionStorage = originalSessionStorage;
    });
  });
});

describe('MemoryStorageStrategy', () => {
  let strategy: MemoryStorageStrategy;

  beforeEach(() => {
    strategy = new MemoryStorageStrategy();
  });

  describe('setItem', () => {
    it('should store item in memory', () => {
      strategy.setItem('testKey', 'testValue');

      expect(strategy.getItem('testKey')).toBe('testValue');
    });

    it('should overwrite existing item', () => {
      strategy.setItem('testKey', 'firstValue');
      strategy.setItem('testKey', 'secondValue');

      expect(strategy.getItem('testKey')).toBe('secondValue');
    });

    it('should handle empty string value', () => {
      strategy.setItem('emptyKey', '');

      expect(strategy.getItem('emptyKey')).toBe('');
    });

    it('should handle multiple keys independently', () => {
      strategy.setItem('key1', 'value1');
      strategy.setItem('key2', 'value2');

      expect(strategy.getItem('key1')).toBe('value1');
      expect(strategy.getItem('key2')).toBe('value2');
    });
  });

  describe('getItem', () => {
    it('should retrieve item from memory', () => {
      strategy.setItem('testKey', 'testValue');

      const result = strategy.getItem('testKey');

      expect(result).toBe('testValue');
    });

    it('should return null for non-existent key', () => {
      const result = strategy.getItem('nonExistentKey');

      expect(result).toBeNull();
    });

    it('should return empty string for empty value', () => {
      strategy.setItem('emptyKey', '');

      const result = strategy.getItem('emptyKey');

      expect(result).toBe('');
    });
  });

  describe('removeItem', () => {
    it('should remove item from memory', () => {
      strategy.setItem('testKey', 'testValue');

      strategy.removeItem('testKey');

      expect(strategy.getItem('testKey')).toBeNull();
    });

    it('should not throw error when removing non-existent key', () => {
      expect(() => {
        strategy.removeItem('nonExistentKey');
      }).not.toThrow();
    });

    it('should only remove specified key', () => {
      strategy.setItem('key1', 'value1');
      strategy.setItem('key2', 'value2');

      strategy.removeItem('key1');

      expect(strategy.getItem('key1')).toBeNull();
      expect(strategy.getItem('key2')).toBe('value2');
    });
  });

  describe('clear', () => {
    it('should clear all items from memory', () => {
      strategy.setItem('key1', 'value1');
      strategy.setItem('key2', 'value2');
      strategy.setItem('key3', 'value3');

      strategy.clear();

      expect(strategy.getItem('key1')).toBeNull();
      expect(strategy.getItem('key2')).toBeNull();
      expect(strategy.getItem('key3')).toBeNull();
    });

    it('should work when storage is already empty', () => {
      expect(() => {
        strategy.clear();
      }).not.toThrow();

      expect(strategy.getItem('anyKey')).toBeNull();
    });
  });

  describe('Isolation', () => {
    it('should not share data between instances', () => {
      const strategy1 = new MemoryStorageStrategy();
      const strategy2 = new MemoryStorageStrategy();

      strategy1.setItem('key', 'value1');
      strategy2.setItem('key', 'value2');

      expect(strategy1.getItem('key')).toBe('value1');
      expect(strategy2.getItem('key')).toBe('value2');
    });

    it('should not persist data after instance is garbage collected', () => {
      let tempStrategy: MemoryStorageStrategy | null = new MemoryStorageStrategy();
      tempStrategy.setItem('key', 'value');

      // Create new instance
      tempStrategy = new MemoryStorageStrategy();

      // Data from old instance should not be accessible
      expect(tempStrategy.getItem('key')).toBeNull();
    });
  });

  describe('Memory vs SessionStorage isolation', () => {
    it('should not affect sessionStorage', () => {
      const memStrategy = new MemoryStorageStrategy();
      sessionStorage.clear();

      memStrategy.setItem('testKey', 'testValue');

      // Should not affect sessionStorage
      expect(sessionStorage.getItem('testKey')).toBeNull();
    });
  });
});

describe('StorageStrategy Interface Compliance', () => {
  const testCases = [
    { name: 'SessionStorageStrategy', factory: () => new SessionStorageStrategy() },
    { name: 'MemoryStorageStrategy', factory: () => new MemoryStorageStrategy() },
  ];

  testCases.forEach(({ name, factory }) => {
    describe(name, () => {
      it('should implement setItem method', () => {
        const strategy = factory();
        expect(typeof strategy.setItem).toBe('function');
      });

      it('should implement getItem method', () => {
        const strategy = factory();
        expect(typeof strategy.getItem).toBe('function');
      });

      it('should implement removeItem method', () => {
        const strategy = factory();
        expect(typeof strategy.removeItem).toBe('function');
      });

      it('should implement clear method', () => {
        const strategy = factory();
        expect(typeof strategy.clear).toBe('function');
      });

      it('should support complete lifecycle: set -> get -> remove', () => {
        const strategy = factory();

        strategy.setItem('lifecycleKey', 'lifecycleValue');
        expect(strategy.getItem('lifecycleKey')).toBe('lifecycleValue');

        strategy.removeItem('lifecycleKey');
        expect(strategy.getItem('lifecycleKey')).toBeNull();
      });
    });
  });
});
