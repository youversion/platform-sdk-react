import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useLanguagesClient } from './useLanguageClient';
import { YouVersionContext } from './context';
import { LanguagesClient, ApiClient } from '@youversion/platform-core';

// Mock the core package
vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    LanguagesClient: vi.fn(function () {
      return {};
    }),
    ApiClient: vi.fn(function () {
      return { isApiClient: true };
    }),
  };
});

describe('useLanguagesClient', () => {
  const mockAppKey = 'test-app-key';

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>
    );
  };

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(LanguagesClient).mockImplementation(function () {
      const mockClient: Partial<LanguagesClient> = { getLanguages: vi.fn() };
      return mockClient;
    });

    vi.mocked(ApiClient).mockImplementation(function () {
      const mockApiClient = { isApiClient: true };
      return mockApiClient;
    });
  });

  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useLanguagesClient())).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({
        appKey: '',
      });

      expect(() => renderHook(() => useLanguagesClient(), { wrapper })).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create LanguagesClient with correct ApiClient config', () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      renderHook(() => useLanguagesClient(), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({
        appKey: mockAppKey,
      });
      expect(LanguagesClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize LanguagesClient instance', () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { rerender } = renderHook(() => useLanguagesClient(), { wrapper });

      rerender();

      expect(LanguagesClient).toHaveBeenCalledTimes(1);
    });

    it('should create new LanguagesClient when context values change', () => {
      let currentAppKey = mockAppKey;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <YouVersionContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          {children}
        </YouVersionContext.Provider>
      );

      const { rerender } = renderHook(() => useLanguagesClient(), { wrapper });

      expect(LanguagesClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';
      rerender();

      expect(LanguagesClient).toHaveBeenCalledTimes(2);
    });
  });
});
