'use client';

import { useContext } from 'react';
import { YouVersionContext } from './context/YouVersionContext';
import type { HookOverrides } from './hook-overrides';

/**
 * Reads the named `hookOverrides` entry from YouVersionContext.
 * Data hooks still call their inner hooks; when this returns a function they
 * skip fetch with `enabled: !override` and return that function's result.
 */
export function useHookOverride<K extends keyof HookOverrides>(
  name: K,
): HookOverrides[K] | undefined {
  return useContext(YouVersionContext)?.hookOverrides?.[name];
}
