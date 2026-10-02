import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { YouVersionProvider } from './context/YouVersionProvider';
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

it('follows system theme changes until overridden and unsubscribes on unmount', () => {
  const media = Object.assign(new EventTarget(), { matches: true });
  const addListener = vi.spyOn(media, 'addEventListener');
  const removeListener = vi.spyOn(media, 'removeEventListener');
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  let theme: 'light' | 'dark' | 'system' = 'system';
  const wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionProvider appKey="test-app" theme={theme}>
      {children}
    </YouVersionProvider>
  );
  try {
    const { result, rerender, unmount } = renderHook(() => useTheme(), { wrapper });
    expect(result.current).toBe('dark');
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    act(() => {
      media.matches = false;
      media.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
    });
    expect(result.current).toBe('light');

    theme = 'dark';
    rerender();
    expect(result.current).toBe('dark');
    expect(removeListener).toHaveBeenCalledTimes(1);
    act(() => {
      media.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
    });
    expect(result.current).toBe('dark');

    theme = 'system';
    rerender();
    expect(result.current).toBe('light');
    const listener = addListener.mock.calls.at(-1)?.[1];
    unmount();
    expect(removeListener).toHaveBeenCalledTimes(2);
    expect(removeListener).toHaveBeenLastCalledWith('change', listener);
  } finally {
    vi.unstubAllGlobals();
  }
});
