import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { ReactNode } from 'react';
import { useVerseOfTheDay } from './useVOTD';
import { BibleSDKContext } from './context';
import { BibleClient, ApiClient, type VOTD } from '@youversion/platform-core';

const MOCK_INSTALLATION_ID = 'auto-generated-uuid';

// Mock the core package
vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    BibleClient: vi.fn(function () {
      return {};
    }),
    ApiClient: vi.fn(function () {
      return { isApiClient: true };
    }),
    YouVersionPlatformConfiguration: {
      get installationId() {
        return MOCK_INSTALLATION_ID;
      },
    },
  };
});

describe('useVerseOfTheDay', () => {
  const mockAppKey = 'test-app-key';

  const mockVOTD: VOTD = {
    day: 1,
    passage_id: 'ISA.43.19',
  };

  let mockGetVOTD: Mock;

  const createWrapper = (contextValue: { appKey: string }) => {
    return ({ children }: { children: ReactNode }) => (
      <BibleSDKContext.Provider value={contextValue}>{children}</BibleSDKContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetVOTD = vi.fn().mockResolvedValue(mockVOTD);

    (BibleClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getVOTD: mockGetVOTD,
      };
    });

    (ApiClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        isApiClient: true,
      };
    });
  });

  describe('context validation', () => {
    it('should throw error when context is not provided', () => {
      expect(() => renderHook(() => useVerseOfTheDay(1))).toThrow(
        'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      const wrapper = createWrapper({
        appKey: '',
      });

      expect(() => renderHook(() => useVerseOfTheDay(1), { wrapper })).toThrow(
        'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create BibleClient with correct ApiClient config', () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      renderHook(() => useVerseOfTheDay(1), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({
        appKey: mockAppKey,
        installationId: MOCK_INSTALLATION_ID,
      });
      expect(BibleClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize BibleClient instance', () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper });
      const _firstRefetch = result.current.refetch;

      rerender();
      const _secondRefetch = result.current.refetch;

      expect(BibleClient).toHaveBeenCalledTimes(1);
    });

    it('should create new BibleClient when context values change', () => {
      let currentAppKey = mockAppKey;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <BibleSDKContext.Provider
          value={{
            appKey: currentAppKey,
          }}
        >
          {children}
        </BibleSDKContext.Provider>
      );

      const { rerender } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      expect(BibleClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';
      rerender();

      expect(BibleClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching VOTD', () => {
    it('should fetch VOTD for day 1', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledWith(1);
      expect(result.current.data).toEqual(mockVOTD);
    });

    it('should fetch VOTD for day 100', async () => {
      const mockVOTD100: VOTD = { day: 100, passage_id: 'PSA.23.1' };
      mockGetVOTD.mockResolvedValueOnce(mockVOTD100);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerseOfTheDay(100), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledWith(100);
      expect(result.current.data).toEqual(mockVOTD100);
    });

    it('should fetch VOTD for day 366', async () => {
      const mockVOTD366: VOTD = { day: 366, passage_id: 'REV.22.21' };
      mockGetVOTD.mockResolvedValueOnce(mockVOTD366);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerseOfTheDay(366), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledWith(366);
      expect(result.current.data).toEqual(mockVOTD366);
    });

    it('should refetch when day changes', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result, rerender } = renderHook(({ day }) => useVerseOfTheDay(day), {
        wrapper,
        initialProps: { day: 1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledTimes(1);
      expect(mockGetVOTD).toHaveBeenLastCalledWith(1);

      rerender({ day: 100 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledTimes(2);
      expect(mockGetVOTD).toHaveBeenLastCalledWith(100);
    });

    it('should not fetch when enabled is false', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerseOfTheDay(1, { enabled: false }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).not.toHaveBeenCalled();
      expect(result.current.data).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch VOTD');
      mockGetVOTD.mockRejectedValueOnce(error);

      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBe(null);
    });

    it('should support manual refetch', async () => {
      const wrapper = createWrapper({
        appKey: mockAppKey,
      });

      const { result } = renderHook(() => useVerseOfTheDay(1), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetVOTD).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetVOTD).toHaveBeenCalledTimes(2);
      });
    });
  });
});
