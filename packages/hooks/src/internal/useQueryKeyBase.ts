'use client';

import { useContext } from 'react';
import { YouVersionContext } from '../context';

/**
 * Returns the first segments of the cache key for every data hook.
 *
 * Two providers with different config must not share cached data, so the key
 * carries the config values. Every segment must be a plain value, because
 * TanStack Query converts the key to text to compare keys. A class instance
 * does not convert to stable text.
 */
export function useQueryKeyBase(): readonly unknown[] {
  const context = useContext(YouVersionContext);
  return [
    context?.appKey,
    context?.apiHost,
    context?.installationId,
    context?.additionalHeadersKey ?? null,
  ];
}
