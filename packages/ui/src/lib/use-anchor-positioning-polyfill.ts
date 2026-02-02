import { useEffect } from 'react';

let polyfillPromise: Promise<void> | null = null;

async function loadPolyfill(): Promise<void> {
  if ('anchorName' in document.documentElement.style) {
    return;
  }

  const { default: polyfill } = await import(
    '@oddbird/css-anchor-positioning/fn'
  );
  await polyfill();
}

export function useAnchorPositioningPolyfill(): void {
  useEffect(() => {
    if (!polyfillPromise) {
      polyfillPromise = loadPolyfill();
    }
  }, []);
}
