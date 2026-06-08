import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDelayedLoading } from './use-delayed-loading';

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays false while not loading', () => {
    const { result } = renderHook(() => useDelayedLoading(false));
    expect(result.current).toBe(false);
  });

  it('does not surface a fast load that resolves before the delay', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading, 250), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    rerender({ loading: false });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(false);
  });

  it('surfaces a slow load once the delay elapses', () => {
    const { result } = renderHook(() => useDelayedLoading(true, 250));

    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe(true);
  });

  it('resets to false as soon as loading clears', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading, 250), {
      initialProps: { loading: true },
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
});
