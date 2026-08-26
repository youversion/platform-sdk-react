import type { DefaultOptions } from '@tanstack/react-query';

/**
 * Query defaults for every `QueryClient` in this repository.
 *
 * `YouVersionProvider` builds its private client from this object. Test
 * providers do the same, so tests run with the fetch semantics of the app.
 * The `TestQueryClientProvider` in `packages/ui` cannot import this module —
 * the package exports only its root — so it holds a mirrored copy. A change
 * here must also change that copy.
 *
 * The reasons for each option are in `docs/adr/0006`.
 */
export const queryClientDefaultOptions: DefaultOptions = {
  queries: {
    // Hooks show the error on the first failure.
    // TanStack Query retries three times by default.
    // Those retries delay the error.
    retry: false,
    // Hooks always attempt the request and report a transport
    // failure through `error`.
    // TanStack Query pauses a fetch by default when the browser
    // reports that it is offline.
    // A paused first load stays `loading: true` and never settles.
    // A paused fetch after a key change shows the previous key's
    // data as if it belonged to the new key.
    networkMode: 'always',
    // Returning to the tab costs no request.
    // TanStack Query revalidates every mounted query on focus by
    // default, and a reader holds several at once.
    // Most reads are Bible content, which does not change while the
    // reader is open.
    // Mounting, a key change, and `refetch` all still revalidate, so
    // data stays fresh at the points that matter.
    refetchOnWindowFocus: false,
    // A read that failed fetches again when the network returns.
    // A settled read keeps its data and does not refetch, so a
    // reconnect does not revalidate every mounted query at once.
    // TanStack Query infers this option from `networkMode`, and
    // `always` makes that inference `false`.
    // With `retry: false` and `refetchOnWindowFocus: false`, an
    // errored read has no other way back — only a remount or a page
    // reload would fetch again.
    refetchOnReconnect: (query) => query.state.status === 'error',
  },
};
