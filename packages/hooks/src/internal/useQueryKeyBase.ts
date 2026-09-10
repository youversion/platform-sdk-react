'use client';

import { useContext, useMemo } from 'react';
import { YouVersionContext } from '../context/YouVersionContext';
import { serializeAdditionalHeaders } from './additionalHeadersKey';
import { serializeVersionFilters } from './versionFilterKey';

/**
 * @internal
 * Returns the first segments of the cache key for every data hook.
 *
 * Two providers with different config must not share cached data, so the key
 * carries the config values. Every segment must be a plain value, because
 * TanStack Query converts the key to text to compare keys. A class instance
 * does not convert to stable text.
 *
 * The header segment is serialized here from `context.additionalHeaders`.
 * `YouVersionContext` is public, so a host can render the context directly and
 * set `additionalHeaders`. Those headers reach the request, so they must also
 * reach the key. A precomputed key field on the context would be unset for
 * such a host, and two header sets would then share one cache entry.
 *
 * The last segment is the active Bible version filter. That filter lives on
 * `YouVersionPlatformConfiguration`, not on the context, and it decides which
 * versions a read may return. Keeping it in the key means a provider that
 * tightens the filter no longer serves content cached under the looser one: the
 * tighter filter reads a different key, and the entry it would have reused stays
 * out of view.
 *
 * The `YouVersionProvider` props are the supported way to set the filter; the
 * provider syncs them onto the config during render, so every child render
 * reads the current value here. A direct write to the config statics from app
 * code triggers no render and is unsupported — the key updates on the next
 * render for any other reason, not at the moment of the write.
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
