import { useRef } from 'react';
import { IS_PRODUCTION } from '@/lib/constants';

/** Logs `message` once per ref in development. */
export function warnOnce(didWarnRef: { current: boolean }, message: string): void {
  if (IS_PRODUCTION || didWarnRef.current) return;
  didWarnRef.current = true;
  console.warn(message);
}

/**
 * Latches whether `highlights` was provided on the first render.
 * Later presence/absence flips warn once in development and do not
 * change the latched mode.
 */
export function useHighlightsControlledLatch(
  highlights: readonly unknown[] | undefined,
  componentName: string,
): boolean {
  const isHighlightsControlledRef = useRef(highlights !== undefined);
  const isHighlightsControlled = isHighlightsControlledRef.current;
  const didWarnRef = useRef(false);
  if ((highlights !== undefined) !== isHighlightsControlled) {
    warnOnce(
      didWarnRef,
      `${componentName}: the \`highlights\` prop switched from ${
        isHighlightsControlled ? 'present to absent' : 'absent to present'
      } after mount. Highlight mode is latched at first mount and will not change. Pass \`highlights\` (use \`[]\` for "nothing highlighted") on every render for controlled mode, or never pass it.`,
    );
  }
  return isHighlightsControlled;
}
