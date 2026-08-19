import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { useLanguagesClient } from './useLanguageClient';
import { YouVersionContext } from './context';
import { LanguagesClient } from '@youversion/platform-core';
import { createLanguagesClientStub, createYVWrapper } from './test/utils';

describe('useLanguagesClient', () => {
  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useLanguagesClient())).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider value={{ appKey: '' }}>{children}</YouVersionContext.Provider>
      );

      expect(() => renderHook(() => useLanguagesClient(), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create a LanguagesClient when context is valid', () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useLanguagesClient(), { wrapper });

      expect(result.current).toBeInstanceOf(LanguagesClient);
    });

    it('should return the injected LanguagesClient when present', () => {
      const languagesClient = createLanguagesClientStub({});
      const wrapper = createYVWrapper('test-app-key', { languagesClient });
      const { result } = renderHook(() => useLanguagesClient(), { wrapper });

      expect(result.current).toBe(languagesClient);
    });

    it('should memoize LanguagesClient instance', () => {
      const wrapper = createYVWrapper();
      const { result, rerender } = renderHook(() => useLanguagesClient(), { wrapper });
      const firstClient = result.current;

      rerender();

      expect(result.current).toBe(firstClient);
    });

    it('should create new LanguagesClient when context values change', () => {
      let currentAppKey = 'test-app-key';

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          {children}
        </YouVersionContext.Provider>
      );

      const { result, rerender } = renderHook(() => useLanguagesClient(), { wrapper });
      const firstClient = result.current;

      currentAppKey = 'new-app-key';
      rerender();

      expect(result.current).not.toBe(firstClient);
      expect(result.current).toBeInstanceOf(LanguagesClient);
    });
  });
});
