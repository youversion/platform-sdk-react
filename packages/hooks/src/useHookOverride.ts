'use client';

import { useContext } from 'react';
import { YouVersionContext } from './context/YouVersionContext';
import type { HookOverrides } from './hook-overrides';

export function useHookOverride<K extends keyof HookOverrides>(
  name: K,
): HookOverrides[K] | undefined {
  return useContext(YouVersionContext)?.hookOverrides?.[name];
}
