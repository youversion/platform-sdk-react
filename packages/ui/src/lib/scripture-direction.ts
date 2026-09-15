import { useMemo } from 'react';
import type { TextDirection } from '@youversion/platform-core';
import { transformBibleHtml } from '@youversion/platform-core/browser';

export type ResolvedScriptureDirection = TextDirection | 'auto';

export function useResolvedScriptureDirection(
  html: string | undefined,
  scriptureDirection: TextDirection | undefined,
): ResolvedScriptureDirection {
  return useMemo(() => {
    if (scriptureDirection) return scriptureDirection;
    if (!html || !globalThis.DOMParser) return 'auto';
    return transformBibleHtml(html).direction ?? 'auto';
  }, [html, scriptureDirection]);
}
