import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, vi, beforeEach, type Mock } from 'vitest';
import { it } from './test/hook-fixtures';
import type { ReactNode } from 'react';
import { useHighlights } from './useHighlights';
import { YouVersionContext } from './context';
import {
  HighlightsClient,
  ApiClient,
  type Collection,
  type Highlight,
  type CreateHighlight,
} from '@youversion/platform-core';

// Mock the core package
vi.mock('@youversion/platform-core', async () => {
  const actual = await vi.importActual('@youversion/platform-core');
  return {
    ...actual,
    HighlightsClient: vi.fn(function () {
      return {};
    }),
    ApiClient: vi.fn(function () {
      return { isApiClient: true };
    }),
  };
});

describe('useHighlights', () => {
  const mockHighlights: Collection<Highlight> = {
    data: [
      {
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      },
      {
        version_id: 111,
        passage_id: 'MAT.1.2',
        color: '5dff79',
      },
    ],
    next_page_token: null,
  };

  const mockHighlight: Highlight = {
    version_id: 111,
    passage_id: 'MAT.1.1',
    color: 'fffe00',
  };

  let mockGetHighlights: Mock;
  let mockCreateHighlight: Mock;
  let mockDeleteHighlight: Mock;

  beforeEach(() => {
    mockGetHighlights = vi.fn().mockResolvedValue(mockHighlights);
    mockCreateHighlight = vi.fn().mockResolvedValue(mockHighlight);
    mockDeleteHighlight = vi.fn().mockResolvedValue(undefined);

    (HighlightsClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return {
        getHighlights: mockGetHighlights,
        createHighlight: mockCreateHighlight,
        deleteHighlight: mockDeleteHighlight,
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
      expect(() => renderHook(() => useHighlights())).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });

    it('should throw error when appKey is missing', () => {
      expect(() => renderHook(() => useHighlights())).toThrow(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    });
  });

  describe('client creation', () => {
    it('should create HighlightsClient with correct ApiClient config', ({ wrapper }) => {
      renderHook(() => useHighlights(), { wrapper });

      expect(ApiClient).toHaveBeenCalledWith({
        appKey: 'test-app-key',
      });
      expect(HighlightsClient).toHaveBeenCalledWith(expect.objectContaining({ isApiClient: true }));
    });

    it('should memoize HighlightsClient instance', ({ wrapper }) => {
      const { rerender } = renderHook(() => useHighlights(), { wrapper });

      rerender();

      // If client is memoized, refetch should be stable (though useCallback might still create new refs)
      expect(HighlightsClient).toHaveBeenCalledTimes(1);
    });

    it('should create new HighlightsClient when context values change', () => {
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

      const { rerender } = renderHook(() => useHighlights(), { wrapper });

      expect(HighlightsClient).toHaveBeenCalledTimes(1);

      currentAppKey = 'new-app-key';

      rerender();

      expect(HighlightsClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetching highlights', () => {
    it('should fetch highlights with no options', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.highlights).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledWith(undefined);
      expect.soft(result.current.highlights).toEqual(mockHighlights);
    });

    it('should fetch highlights with version_id option', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights({ version_id: 111 }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledWith({ version_id: 111 });
      expect.soft(result.current.highlights).toEqual(mockHighlights);
    });

    it('should fetch highlights with passage_id option', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights({ passage_id: 'MAT.1.1' }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledWith({ passage_id: 'MAT.1.1' });
      expect.soft(result.current.highlights).toEqual(mockHighlights);
    });

    it('should fetch highlights with both options', async ({ wrapper }) => {
      const { result } = renderHook(
        () => useHighlights({ version_id: 111, passage_id: 'MAT.1.1' }),
        {
          wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledWith({
        version_id: 111,
        passage_id: 'MAT.1.1',
      });
      expect.soft(result.current.highlights).toEqual(mockHighlights);
    });

    it('should refetch when options change', async ({ wrapper }) => {
      const { result, rerender } = renderHook(({ options }) => useHighlights(options), {
        wrapper,
        initialProps: { options: { version_id: 111 } },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      rerender({ options: { version_id: 1 } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).toHaveBeenCalledTimes(2);
      expect.soft(mockGetHighlights).toHaveBeenLastCalledWith({ version_id: 1 });
    });

    it('should not fetch when enabled is false', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights(undefined, { enabled: false }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetHighlights).not.toHaveBeenCalled();
      expect.soft(result.current.highlights).toBe(null);
    });

    it('should handle fetch errors', async ({ wrapper }) => {
      const error = new Error('Failed to fetch highlights');
      mockGetHighlights.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.highlights).toBe(null);
    });

    it('should support manual refetch', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetHighlights).toHaveBeenCalledTimes(1);

      result.current.refetch();

      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('createHighlight mutation', () => {
    it('should create highlight and refetch', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const createData: CreateHighlight = {
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      };

      const createPromise = result.current.createHighlight(createData);

      await waitFor(() => {
        expect(mockCreateHighlight).toHaveBeenCalledWith(createData);
      });

      const created = await createPromise;
      expect(created).toEqual(mockHighlight);

      // Should refetch after creation
      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle create error', async ({ wrapper }) => {
      const error = new Error('Failed to create highlight');
      mockCreateHighlight.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const createData: CreateHighlight = {
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      };

      await expect(result.current.createHighlight(createData)).rejects.toThrow(
        'Failed to create highlight',
      );

      // Should not refetch on error
      expect(mockGetHighlights).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteHighlight mutation', () => {
    it('should delete highlight and refetch', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const deletePromise = result.current.deleteHighlight('MAT.1.1');

      await waitFor(() => {
        expect(mockDeleteHighlight).toHaveBeenCalledWith('MAT.1.1', undefined);
      });

      await deletePromise;

      // Should refetch after deletion
      await waitFor(() => {
        expect(mockGetHighlights).toHaveBeenCalledTimes(2);
      });
    });

    it('should delete highlight with options', async ({ wrapper }) => {
      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const deletePromise = result.current.deleteHighlight('MAT.1.1', { version_id: 111 });

      await waitFor(() => {
        expect(mockDeleteHighlight).toHaveBeenCalledWith('MAT.1.1', { version_id: 111 });
      });

      await deletePromise;

      // Should refetch after deletion
      expect(mockGetHighlights).toHaveBeenCalledTimes(2);
    });

    it('should handle delete error', async ({ wrapper }) => {
      const error = new Error('Failed to delete highlight');
      mockDeleteHighlight.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useHighlights(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.deleteHighlight('MAT.1.1')).rejects.toThrow(
        'Failed to delete highlight',
      );

      // Should not refetch on error
      expect(mockGetHighlights).toHaveBeenCalledTimes(1);
    });
  });
});
