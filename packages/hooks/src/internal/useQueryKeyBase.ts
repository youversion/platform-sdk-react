'use client';

import { useContext, useMemo } from 'react';
import { YouVersionContext } from '../context';
import { serializeAdditionalHeaders } from './additionalHeadersKey';

/**
 * Returns the first segments of the cache key for every data hook.
 *
 * Two providers with different config must not share cached data, so the key
 * carries the config values. Every segment must be a plain value, because
 * TanStack Query converts the key to text to compare keys. A class instance
 * does not convert to stable text.
 *
 * The header segment comes from `context.additionalHeaders`, not from
 * `context.additionalHeadersKey`. `YouVersionContext` is public, so a host can
 * render the context directly and set `additionalHeaders` without setting
 * `additionalHeadersKey`. Those headers reach the request. Reading the
 * precomputed field would leave them out of the key, and two header sets would
 * then share one cache entry.
 */
export function useQueryKeyBase(): readonly unknown[] {
  const context = useContext(YouVersionContext);
  const additionalHeaders = context?.additionalHeaders;
  const additionalHeadersKey = useMemo(
    () => serializeAdditionalHeaders(additionalHeaders),
    [additionalHeaders],
  );

  return [context?.appKey, context?.apiHost, context?.installationId, additionalHeadersKey];
}
