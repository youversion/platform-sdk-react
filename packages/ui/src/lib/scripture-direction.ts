import { useMemo, useSyncExternalStore } from 'react';
import type { TextDirection } from '@youversion/platform-core';
import { transformBibleHtml } from '@youversion/platform-core/browser';

export type ResolvedScriptureDirection = TextDirection | 'auto';

const subscribeToHydration = (): (() => void) => () => undefined;

export function useHydrationSafeScriptureDirection(
  scriptureDirection: TextDirection | undefined,
  inferredDirection: TextDirection | undefined,
): ResolvedScriptureDirection {
  const canUseInferredDirection = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  return scriptureDirection ?? (canUseInferredDirection ? (inferredDirection ?? 'auto') : 'auto');
}

export function useResolvedScriptureDirection(
  html: string | undefined,
  scriptureDirection: TextDirection | undefined,
): ResolvedScriptureDirection {
  const inferredDirection = useMemo(() => {
    if (!html || !globalThis.DOMParser) return undefined;
    return transformBibleHtml(html).direction;
  }, [html]);

  return useHydrationSafeScriptureDirection(scriptureDirection, inferredDirection);
}
