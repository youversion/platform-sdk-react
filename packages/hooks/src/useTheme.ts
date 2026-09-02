'use client';

import { useContext } from 'react';
import { YouVersionContext } from './context/YouVersionContext';
import { useHookOverride } from './useHookOverride';

/**
 * Hook to access the current theme from YouVersionContext
 *
 * @returns The current theme ('light' or 'dark'), defaults to 'light' if provider is missing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const theme = useTheme();
 * }
 * ```
 */
export function useTheme(): 'light' | 'dark' {
  const override = useHookOverride('useTheme');
  const context = useContext(YouVersionContext);
  if (override) return override();

  // Default to 'light' to match YouVersionProvider's default
  return context?.theme || 'light';
}
