import { render, renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { usePassage, type UsePassageResult } from './usePassage';
import { YouVersionContext } from './context';
import {
  cacheEnvelope,
  createBibleClientStub,
  createYVWrapper,
  TestQueryClientProvider,
} from './test/utils';
import { createMockPassage } from './__tests__/mocks/bibles';

type PassageArgs = { versionId: number; usfm: string; format: 'html' | 'text' };
type PassageRead = {
  resource: 'passage';
  versionId: number;
  usfm: string;
  format: 'html' | 'text';
  include_headings: boolean;
  include_notes: boolean;
  transform: boolean;
};
type PassageHookProbe = {
  current: UsePassageResult | null;
};

const passageRead = (
  versionId: number,
  usfm: string,
  format: 'html' | 'text' = 'html',
  include_headings = false,
  include_notes = false,
  transform = true,
): PassageRead => ({
  resource: 'passage',
  versionId,
  usfm,
  format,
  include_headings,
  include_notes,
  transform,
});

describe('usePassage', () => {
  const mockGetPassage = vi.fn();
  const mockPassage = createMockPassage();
  const bibleClient = createBibleClientStub({ readWithPolicy: mockGetPassage });
  const wrapper = createYVWrapper('test-app-key', { bibleClient });

  beforeEach(() => {
    mockGetPassage.mockResolvedValue(cacheEnvelope(mockPassage));
  });

  describe('basic fetching', () => {
    it('should show loading then passage data', async () => {
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

    it('should call readWithPolicy with correct default args', async () => {
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm: 'JHN.3.16' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(passageRead(3034, 'JHN.3.16'));
    });

    it('should forward transform: false so callers can opt out of HTML transformation', async () => {
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', transform: false }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect
        .soft(mockGetPassage)
        .toHaveBeenCalledWith(passageRead(3034, 'JHN.3.16', 'html', false, false, false));
    });
  });

  describe('USFM validation', () => {
    it.each(['', 'undefined', 'null'])('should skip fetch when usfm is "%s"', async (usfm) => {
      const { result } = renderHook(() => usePassage({ versionId: 3034, usfm }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).not.toHaveBeenCalled();
      expect.soft(result.current.passage).toBe(null);
    });
  });

  describe('format options', () => {
    it('should fetch with format text when specified', async () => {
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', format: 'text' }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(passageRead(3034, 'JHN.3.16', 'text'));
    });
  });

  describe('heading and notes options', () => {
    it('should pass include_headings=true', async () => {
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', include_headings: true }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect.soft(mockGetPassage).toHaveBeenCalledWith(passageRead(3034, 'JHN.3.16', 'html', true));
    });

    it('should pass include_notes=true', async () => {
      const { result } = renderHook(
        () => usePassage({ versionId: 3034, usfm: 'JHN.3.16', include_notes: true }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect
        .soft(mockGetPassage)
        .toHaveBeenCalledWith(passageRead(3034, 'JHN.3.16', 'html', false, true));
    });

    it('should pass all options combined', async () => {
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

      expect
        .soft(mockGetPassage)
        .toHaveBeenCalledWith(passageRead(3034, 'JHN.3', 'text', true, true));
    });
  });

  describe('parameter change refetching', () => {
    it.each([
      {
        param: 'versionId',
        initial: { versionId: 1, usfm: 'JHN.3.16', format: 'html' },
        updated: { versionId: 3034, usfm: 'JHN.3.16', format: 'html' },
        expectedInitial: passageRead(1, 'JHN.3.16'),
        expectedUpdated: passageRead(3034, 'JHN.3.16'),
      },
      {
        param: 'usfm',
        initial: { versionId: 3034, usfm: 'JHN.3.16', format: 'html' },
        updated: { versionId: 3034, usfm: 'GEN.1.1', format: 'html' },
        expectedInitial: passageRead(3034, 'JHN.3.16'),
        expectedUpdated: passageRead(3034, 'GEN.1.1'),
      },
      {
        param: 'format',
        initial: { versionId: 3034, usfm: 'JHN.3.16', format: 'html' },
        updated: { versionId: 3034, usfm: 'JHN.3.16', format: 'text' },
        expectedInitial: passageRead(3034, 'JHN.3.16'),
        expectedUpdated: passageRead(3034, 'JHN.3.16', 'text'),
      },
    ] satisfies {
      param: string;
      initial: PassageArgs;
      updated: PassageArgs;
      expectedInitial: PassageRead;
      expectedUpdated: PassageRead;
    }[])(
      'should refetch when $param changes',
      async ({ initial, updated, expectedInitial, expectedUpdated }) => {
        const { result, rerender } = renderHook<UsePassageResult, PassageArgs>(
          ({ versionId, usfm, format }) => usePassage({ versionId, usfm, format }),
          {
            wrapper,
            initialProps: initial,
          },
        );

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetPassage).toHaveBeenCalledTimes(1);
        expect.soft(mockGetPassage).toHaveBeenLastCalledWith(expectedInitial);

        act(() => {
          rerender(updated);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect.soft(mockGetPassage).toHaveBeenCalledTimes(2);
        expect.soft(mockGetPassage).toHaveBeenLastCalledWith(expectedUpdated);
      },
    );
  });

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
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

    it('should not fetch when both enabled is false and usfm is invalid', async () => {
      const { result } = renderHook(
        () =>
          usePassage({
            versionId: 3034,
            usfm: '',
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
      const error = new Error('Failed to fetch passage');
      mockGetPassage.mockRejectedValueOnce(error).mockResolvedValueOnce(cacheEnvelope(mockPassage));

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

  it('does not refetch a remount while Cache-Control lifetime remains', async () => {
    mockGetPassage.mockResolvedValue(cacheEnvelope(mockPassage, 60_000));

    const latest: PassageHookProbe = { current: null };
    function Probe() {
      latest.current = usePassage({ versionId: 3034, usfm: 'JHN.3.16' });
      return null;
    }
    function App({ mounted }: { mounted: boolean }) {
      return (
        <YouVersionContext.Provider value={{ appKey: 'test-app-key', bibleClient }}>
          <TestQueryClientProvider>{mounted ? <Probe /> : null}</TestQueryClientProvider>
        </YouVersionContext.Provider>
      );
    }

    const { rerender } = render(<App mounted />);
    await waitFor(() => {
      expect(latest.current?.loading).toBe(false);
    });
    expect(latest.current?.passage).toEqual(mockPassage);
    expect(mockGetPassage).toHaveBeenCalledTimes(1);
    expect(mockGetPassage).toHaveBeenCalledWith(passageRead(3034, 'JHN.3.16'));

    rerender(<App mounted={false} />);
    rerender(<App mounted />);

    await waitFor(() => {
      expect(latest.current?.loading).toBe(false);
    });
    expect(latest.current?.passage).toEqual(mockPassage);
    expect(mockGetPassage).toHaveBeenCalledTimes(1);
  });
});
