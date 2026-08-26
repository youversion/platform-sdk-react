'use client';

import { useContext, useMemo } from 'react';
import { YouVersionContext } from '../context';
import { serializeAdditionalHeaders } from './additionalHeadersKey';
import { serializeVersionFilters } from './versionFilterKey';

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
 *
 * The last segment is the active Bible version filter. That filter lives on
 * `YouVersionPlatformConfiguration`, not on the context, and it decides which
 * versions a read may return. Keeping it in the key means a provider that
 * tightens the filter no longer serves content cached under the looser one: the
 * tighter filter reads a different key, and the entry it would have reused stays
 * out of view.
 */
export function useQueryKeyBase(): readonly unknown[] {
  const context = useContext(YouVersionContext);
  const additionalHeaders = context?.additionalHeaders;
  const additionalHeadersKey = useMemo(
    () => serializeAdditionalHeaders(additionalHeaders),
    [additionalHeaders],
  );

  return [
    context?.appKey,
    context?.apiHost,
    context?.installationId,
    additionalHeadersKey,
    serializeVersionFilters(),
  ];
}
