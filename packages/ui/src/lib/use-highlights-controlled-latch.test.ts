import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHighlightsControlledLatch } from './use-highlights-controlled-latch';

type LatchProps = { highlights: unknown[] | undefined };

const present: LatchProps = { highlights: [] };
const absent: LatchProps = { highlights: undefined };
const later: LatchProps = { highlights: [{ id: 1 }] };

describe('useHighlightsControlledLatch', () => {
  it('latches presence at first mount, warns once on a flip, and ignores later data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const controlled = renderHook(
        ({ highlights }: LatchProps) => useHighlightsControlledLatch(highlights, 'TestHost'),
        { initialProps: present },
      );
      expect(controlled.result.current).toBe(true);

      controlled.rerender(absent);
      expect(controlled.result.current).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('TestHost');
      expect(warn.mock.calls[0]![0]).toContain('present to absent');

      controlled.rerender(later);
      expect(controlled.result.current).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      controlled.unmount();
      warn.mockClear();

      const omitted = renderHook(
        ({ highlights }: LatchProps) => useHighlightsControlledLatch(highlights, 'TestHost'),
        { initialProps: absent },
      );
      expect(omitted.result.current).toBe(false);
      omitted.rerender(present);
      expect(omitted.result.current).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('absent to present');
    } finally {
      warn.mockRestore();
    }
  });
});
