import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHighlightsControlledLatch } from './use-highlights-controlled-latch';

describe('useHighlightsControlledLatch', () => {
  it('latches presence at first mount, warns once on a flip, and ignores later data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const controlled = renderHook(
        ({ highlights }: { highlights: unknown[] | undefined }) =>
          useHighlightsControlledLatch(highlights, 'TestHost'),
        { initialProps: { highlights: [] as unknown[] | undefined } },
      );
      expect(controlled.result.current).toBe(true);

      controlled.rerender({ highlights: undefined });
      expect(controlled.result.current).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('TestHost');
      expect(warn.mock.calls[0]![0]).toContain('present to absent');

      controlled.rerender({ highlights: [{ id: 1 }] });
      expect(controlled.result.current).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      controlled.unmount();
      warn.mockClear();

      const omitted = renderHook(
        ({ highlights }: { highlights: unknown[] | undefined }) =>
          useHighlightsControlledLatch(highlights, 'TestHost'),
        { initialProps: { highlights: undefined as unknown[] | undefined } },
      );
      expect(omitted.result.current).toBe(false);
      omitted.rerender({ highlights: [] });
      expect(omitted.result.current).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('absent to present');
    } finally {
      warn.mockRestore();
    }
  });
});
