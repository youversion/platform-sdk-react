import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YouVersionProvider } from '../context/YouVersionProvider';
import { useBooks } from '../useBooks';
import { useVersion } from '../useVersion';

/**
 * The end-to-end guard for in-flight GET deduplication.
 *
 * Core owns a unit test for the dedup map, but it exercises one `ApiClient`
 * directly, so it could not see the real defect: `useApiClient` built its client
 * in a `useMemo`, which runs once per hook instance. Every sibling component got
 * its own client, its own private in-flight map, and its own duplicate request.
 * A production build of `examples/vite-react` showed `/v1/bibles/3034` fired
 * twice and `/v1/bibles/3034/books` three times on one `BibleReader` mount.
 *
 * This test uses the real core client with `fetch` stubbed, which is the lowest
 * level at which the sharing is observable from the hooks package.
 */

const BOOKS_URL = 'https://api.youversion.com/v1/bibles/111/books';
const VERSION_URL = 'https://api.youversion.com/v1/bibles/111';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function BooksSibling({ label }: { label: string }) {
  const { books, loading, error } = useBooks(111);
  if (loading) return <div>{label}:loading</div>;
  if (error) return <div>{label}:error</div>;
  return <div>{`${label}:${books?.data?.length ?? 0}`}</div>;
}

function VersionSibling({ label }: { label: string }) {
  const { version, loading } = useVersion(111);
  if (loading) return <div>{label}:loading</div>;
  return <div>{`${label}:${version?.abbreviation ?? 'none'}`}</div>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shared ApiClient deduplicates sibling requests', () => {
  it('issues one request when two siblings ask for the same endpoint concurrently', async () => {
    const deferred = Promise.withResolvers<Response>();
    const fetchStub = vi.fn((_url: string) => deferred.promise);
    vi.stubGlobal('fetch', fetchStub);

    render(
      <YouVersionProvider appKey="test-app-key">
        <BooksSibling label="a" />
        <BooksSibling label="b" />
      </YouVersionProvider>,
    );

    await waitFor(() => expect(fetchStub).toHaveBeenCalled());
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub.mock.calls[0]?.[0]).toBe(BOOKS_URL);

    deferred.resolve(jsonResponse({ data: [{ usfm: 'GEN' }, { usfm: 'EXO' }] }));

    expect(await screen.findByText('a:2')).toBeInTheDocument();
    expect(await screen.findByText('b:2')).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('issues one request per distinct endpoint across a mixed sibling set', async () => {
    const booksDeferred = Promise.withResolvers<Response>();
    const versionDeferred = Promise.withResolvers<Response>();

    const fetchStub = vi.fn((url: string) =>
      url === BOOKS_URL ? booksDeferred.promise : versionDeferred.promise,
    );
    vi.stubGlobal('fetch', fetchStub);

    render(
      <YouVersionProvider appKey="test-app-key">
        <BooksSibling label="a" />
        <VersionSibling label="b" />
        <BooksSibling label="c" />
        <VersionSibling label="d" />
      </YouVersionProvider>,
    );

    await waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(2));

    const requestedUrls = fetchStub.mock.calls.map(([url]) => url).sort();
    expect(requestedUrls).toEqual([VERSION_URL, BOOKS_URL].sort());

    booksDeferred.resolve(jsonResponse({ data: [{ usfm: 'GEN' }] }));
    versionDeferred.resolve(jsonResponse({ id: 111, abbreviation: 'NIV' }));

    expect(await screen.findByText('a:1')).toBeInTheDocument();
    expect(await screen.findByText('c:1')).toBeInTheDocument();
    expect(await screen.findByText('b:NIV')).toBeInTheDocument();
    expect(await screen.findByText('d:NIV')).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('shares in flight only — a sibling mounted after the first settles refetches', async () => {
    const fetchStub = vi.fn(() => Promise.resolve(jsonResponse({ data: [{ usfm: 'GEN' }] })));
    vi.stubGlobal('fetch', fetchStub);

    const { rerender } = render(
      <YouVersionProvider appKey="test-app-key">
        <BooksSibling label="a" />
      </YouVersionProvider>,
    );

    expect(await screen.findByText('a:1')).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(1);

    rerender(
      <YouVersionProvider appKey="test-app-key">
        <BooksSibling label="a" />
        <BooksSibling label="b" />
      </YouVersionProvider>,
    );

    expect(await screen.findByText('b:1')).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});
