import { renderHook, act } from '@testing-library/react';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'first', delay: 500 },
    });

    expect(result.current).toBe('first');

    rerender({ value: 'second', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('first');

    rerender({ value: 'third', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('first');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('third');
  });

  it('should handle different data types', () => {
    const { result: numberResult } = renderHook(() => useDebounce(42, 100));
    expect(numberResult.current).toBe(42);

    const { result: objectResult } = renderHook(() => useDebounce({ key: 'value' }, 100));
    expect(objectResult.current).toEqual({ key: 'value' });

    const { result: arrayResult } = renderHook(() => useDebounce([1, 2, 3], 100));
    expect(arrayResult.current).toEqual([1, 2, 3]);
  });

  it('should update immediately when delay is 0', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 0 },
    });

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 0 });

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current).toBe('updated');
  });
});
