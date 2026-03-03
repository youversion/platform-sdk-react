import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { usePassage } from './usePassage';
import { type BibleClient } from '@youversion/platform-core';
import { useBibleClient } from './useBibleClient';
import { createYVWrapper } from './test/utils';
import { createMockPassage } from './__tests__/mocks/bibles';

vi.mock('./useBibleClient');

describe('usePassage', () => {
  const mockGetPassage = vi.fn();
  const mockPassage = createMockPassage();

  beforeEach(() => {
    mockGetPassage.mockResolvedValue(mockPassage);

    const mockClient: Partial<BibleClient> = { getPassage: mockGetPassage };
    vi.mocked(useBibleClient).mockReturnValue(mockClient as BibleClient);
  });

  describe('basic fetching', () => {
    it('should show loading then passage data', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.passage).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.passage).toEqual(mockPassage);
    });

    it('should call getPassage with correct default args', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(3034, 'JHN.3.16', 'html', false, false);
    });
  });

  describe('USFM validation', () => {
    it.each(['', 'undefined', 'null'])('should skip fetch when usfm is "%s"', async (usfm) => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).not.toHaveBeenCalled();
      expect.soft(result.current.passage).toBe(null);
    });
  });

  describe('format options', () => {
    it('should fetch with format html by default', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(3034, 'JHN.3.16', 'html', false, false);
    });

    it('should fetch with format text when specified', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', format: 'text' }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(3034, 'JHN.3.16', 'text', false, false);
    });
  });

  describe('heading and notes options', () => {
    it('should pass include_headings=true', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', include_headings: true }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(3034, 'JHN.3.16', 'html', true, false);
    });

    it('should pass include_notes=true', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', include_notes: true }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(3034, 'JHN.3.16', 'html', false, true);
    });

    it('should pass all options combined', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () =>
          usePassage({
            versionId: 3034,
            usfm: 'JHN.3',
            format: 'text',
            include_headings: true,
            include_notes: true,
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(3034, 'JHN.3', 'text', true, true);
    });
  });

  describe('parameter change refetching', () => {
    it.each([
      {
        param: 'versionId',
        HookFn: ({ val }: { val: number | string }) =>
          usePassage({ versionId: val as number, usfm: 'JHN.3.16' }),
        initial: { val: 1 },
        updated: { val: 3034 },
        expectedInitial: [1, 'JHN.3.16', 'html', false, false],
        expectedUpdated: [3034, 'JHN.3.16', 'html', false, false],
      },
      {
        param: 'usfm',
        HookFn: ({ val }: { val: number | string }) =>
          usePassage({ versionId: 3034, usfm: val as string }),
        initial: { val: 'JHN.3.16' },
        updated: { val: 'GEN.1.1' },
        expectedInitial: [3034, 'JHN.3.16', 'html', false, false],
        expectedUpdated: [3034, 'GEN.1.1', 'html', false, false],
      },
      {
        param: 'format',
        HookFn: ({ val }: { val: number | string }) =>
          usePassage({ versionId: 3034, usfm: 'JHN.3.16', format: val as 'html' | 'text' }),
        initial: { val: 'html' },
        updated: { val: 'text' },
        expectedInitial: [3034, 'JHN.3.16', 'html', false, false],
        expectedUpdated: [3034, 'JHN.3.16', 'text', false, false],
      },
    ])(
      'should refetch when $param changes',
      async ({ HookFn, initial, updated, expectedInitial, expectedUpdated }) => {
        const wrapper = createYVWrapper();
        const { result, rerender } = renderHook(HookFn, {
          wrapper,
          initialProps: initial,
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetPassage).toHaveBeenCalledTimes(1);
        expect.soft(mockGetPassage).toHaveBeenLastCalledWith(...expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetPassage).toHaveBeenCalledTimes(2);
        expect.soft(mockGetPassage).toHaveBeenLastCalledWith(...expectedUpdated);
      },
    );
  });

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () =>
          usePassage({
            versionId: 3034,
            usfm: 'JHN.3.16',
            options: { enabled: false },
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).not.toHaveBeenCalled();
      expect.soft(result.current.passage).toBe(null);
    });

    it('should not fetch when enabled is false even with valid usfm', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(
        () =>
          usePassage({
            versionId: 3034,
            usfm: 'JHN.3.16',
            options: { enabled: false },
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).not.toHaveBeenCalled();
      expect.soft(result.current.passage).toBe(null);
    });
  });

  describe('error handling', () => {
    it('should surface fetch errors', async () => {
      const wrapper = createYVWrapper();
      const error = new Error('Failed to fetch passage');
      mockGetPassage.mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.passage).toBe(null);
    });

    it('should clear error on successful refetch', async () => {
      const wrapper = createYVWrapper();
      const error = new Error('Failed to fetch passage');
      mockGetPassage.mockRejectedValueOnce(error).mockResolvedValueOnce(mockPassage);

      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toEqual(error);
      expect.soft(result.current.passage).toBe(null);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(result.current.error).toBe(null);
      expect.soft(result.current.passage).toEqual(mockPassage);
    });
  });

  describe('refetch', () => {
    it('should support manual refetch', async () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetPassage).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockGetPassage).toHaveBeenCalledTimes(2);
      });
    });
  });
});
