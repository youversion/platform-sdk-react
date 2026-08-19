import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { useBibleClient } from './useBibleClient';
import { YouVersionContext } from './context';
import { BibleClient } from '@youversion/platform-core';
import { createBibleClientStub, createYVWrapper } from './test/utils';

describe('useBibleClient', () => {
  it('should create and return a BibleClient instance when context is valid', () => {
    const wrapper = createYVWrapper();
    const { result } = renderHook(() => useBibleClient(), { wrapper });

    expect(result.current).toBeInstanceOf(BibleClient);
  });

  it('should return the injected BibleClient when present', () => {
    const bibleClient = createBibleClientStub({});
    const wrapper = createYVWrapper('test-app-key', { bibleClient });
    const { result } = renderHook(() => useBibleClient(), { wrapper });

    expect(result.current).toBe(bibleClient);
  });

  it('should throw error when context is not provided', () => {
    expect(() => renderHook(() => useBibleClient())).toThrow(
      'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
    );
  });

  it('should throw error when appKey is missing', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={{ appKey: '' }}>{children}</YouVersionContext.Provider>
    );

    expect(() => renderHook(() => useBibleClient(), { wrapper })).toThrow(
      'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
    );
  });

  it('should memoize the BibleClient instance', () => {
    const wrapper = createYVWrapper();
    const { result, rerender } = renderHook(() => useBibleClient(), { wrapper });
    const firstClient = result.current;

    rerender();
    const secondClient = result.current;

    expect(firstClient).toBe(secondClient);
  });

  it('should create new BibleClient when appKey changes', () => {
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

    const { result, rerender } = renderHook(() => useBibleClient(), { wrapper });

    const firstClient = result.current;
    expect(firstClient).toBeInstanceOf(BibleClient);

    currentAppKey = 'new-app-key';
    rerender();

    const secondClient = result.current;
    expect(firstClient).not.toBe(secondClient);
    expect(secondClient).toBeInstanceOf(BibleClient);
  });

  it('should construct a BibleClient when additionalHeaders are provided', () => {
    const additionalHeaders = { 'X-YVP-Sdk': 'ReactNativeSDK=1.2.3' };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider
        value={{
          appKey: 'test-app-key',
          additionalHeaders,
        }}
      >
        {children}
      </YouVersionContext.Provider>
    );

    const { result } = renderHook(() => useBibleClient(), { wrapper });

    expect(result.current).toBeInstanceOf(BibleClient);
  });
});
