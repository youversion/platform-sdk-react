import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { useBibleClient } from './useBibleClient';
import { BibleSDKContext } from './context';
import { BibleClient, ApiClient } from '@youversion/platform-core';

vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    BibleClient: vi.fn(function () {
      return {
        isBibleClient: true,
      };
    }),
    ApiClient: vi.fn(function () {
      return {
        isApiClient: true,
      };
    }),
    YouVersionPlatformConfiguration: {
      get installationId() {
        return 'auto-generated-uuid';
      },
    },
  };
});

describe('useBibleClient', () => {
  const mockAppId = 'test-app-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create and return a BibleClient instance when context is valid', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BibleSDKContext.Provider
        value={{
          appId: mockAppId,
        }}
      >
        {children}
      </BibleSDKContext.Provider>
    );

    const { result } = renderHook(() => useBibleClient(), { wrapper });

    expect(ApiClient).toHaveBeenCalledWith({
      appId: mockAppId,
      installationId: 'auto-generated-uuid',
    });
    expect(BibleClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    expect(result.current).toEqual(expect.objectContaining({ isBibleClient: true }));
  });

  it('should throw error when context is not provided', () => {
    expect(() => renderHook(() => useBibleClient())).toThrow(
      'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
    );
  });

  it('should throw error when appId is missing', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BibleSDKContext.Provider
        value={{
          appId: '',
        }}
      >
        {children}
      </BibleSDKContext.Provider>
    );

    expect(() => renderHook(() => useBibleClient(), { wrapper })).toThrow(
      'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
    );
  });

  it('should memoize the BibleClient instance', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BibleSDKContext.Provider
        value={{
          appId: mockAppId,
        }}
      >
        {children}
      </BibleSDKContext.Provider>
    );

    const { result, rerender } = renderHook(() => useBibleClient(), { wrapper });
    const firstClient = result.current;

    rerender();
    const secondClient = result.current;

    expect(firstClient).toBe(secondClient);
    expect(BibleClient).toHaveBeenCalledTimes(1);
  });

  it('should create new BibleClient when appId changes', () => {
    let currentAppId = mockAppId;

    const wrapper = ({ children }: { children: ReactNode }) => (
      <BibleSDKContext.Provider
        value={{
          appId: currentAppId,
        }}
      >
        {children}
      </BibleSDKContext.Provider>
    );

    const { result, rerender } = renderHook(() => useBibleClient(), { wrapper });

    const firstClient = result.current;
    expect(BibleClient).toHaveBeenCalledTimes(1);
    expect(ApiClient).toHaveBeenCalledWith({
      appId: mockAppId,
      installationId: 'auto-generated-uuid',
    });

    currentAppId = 'new-app-id';
    rerender();

    const secondClient = result.current;
    expect(BibleClient).toHaveBeenCalledTimes(2);
    expect(firstClient).not.toBe(secondClient);

    expect(ApiClient).toHaveBeenLastCalledWith({
      appId: 'new-app-id',
      installationId: 'auto-generated-uuid',
    });
  });

  it('should throw error when appId is null', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BibleSDKContext.Provider
        value={{
          appId: null as unknown as string,
        }}
      >
        {children}
      </BibleSDKContext.Provider>
    );

    expect(() => renderHook(() => useBibleClient(), { wrapper })).toThrow(
      'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
    );
  });
});
