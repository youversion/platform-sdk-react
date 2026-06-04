import { useEffect, useState } from 'react';

/**
 * Returns `true` only after `loading` has been continuously truthy for `delay` ms.
 *
 * Suppresses loading UI on fast/cached fetches so quick swaps feel instant, surfacing
 * a spinner (and any accompanying treatment, e.g. a dimmed stale view) only when a
 * fetch is genuinely slow. Shared by `BibleCard` and `BibleReader`.
 */
export function useDelayedLoading(loading: boolean, delay = 250): boolean {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }

    const timer = setTimeout(() => setShowSpinner(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return showSpinner;
}
