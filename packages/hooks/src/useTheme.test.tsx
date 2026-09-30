import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { createYVWrapper } from './test/utils';
import { useTheme } from './useTheme';

it('uses the provider theme or override and falls back to light without a provider', () => {
  const fallback = renderHook(() => useTheme());
  expect(fallback.result.current).toBe('light');
  const dark = renderHook(() => useTheme(), {
    wrapper: createYVWrapper('test-app-key', { theme: 'dark' }),
  });
  expect(dark.result.current).toBe('dark');
  const overridden = renderHook(() => useTheme(), {
    wrapper: createYVWrapper('test-app-key', {
      theme: 'dark',
      hookOverrides: { useTheme: () => 'light' },
    }),
  });
  expect(overridden.result.current).toBe('light');
});
