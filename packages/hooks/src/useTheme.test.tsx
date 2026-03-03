import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';
import { createYVWrapper } from './test/utils';

describe('useTheme', () => {
  it('should return light when used outside provider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('light');
  });

  it('should return light when theme is undefined in provider', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createYVWrapper(),
    });
    expect(result.current).toBe('light');
  });

  it('should return light when theme is light', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createYVWrapper('test-app-key', { theme: 'light' }),
    });
    expect(result.current).toBe('light');
  });

  it('should return dark when theme is dark', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: createYVWrapper('test-app-key', { theme: 'dark' }),
    });
    expect(result.current).toBe('dark');
  });
});
