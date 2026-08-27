/**
 * @vitest-environment jsdom
 */
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { YouVersionPlatformConfiguration, type BibleClient } from '@youversion/platform-core';
import { YouVersionContext } from '../context';
import { queryClientDefaultOptions } from './queryClientDefaults';
import { createBibleClientStub, TestQueryClientProvider } from '../test/utils';
import { useVerseOfTheDay } from '../useVOTD';

function Probe(): React.ReactElement {
  const { data } = useVerseOfTheDay(1);
  return <span>{data ? 'loaded' : 'pending'}</span>;
}

/**
 * A host can render `YouVersionContext.Provider` itself, because the context is
 * public. Such a host sets `additionalHeaders` only, and `useQueryKeyBase`
 * derives the key segment from those headers. The React Native Expo SDK is one
 * of these hosts: it replaces `X-YVP-Sdk`.
 */
function rawHost(
  additionalHeaders: Record<string, string>,
  bibleClient: BibleClient,
): React.ReactElement {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test-app-key', additionalHeaders, bibleClient }}>
      <Probe />
    </YouVersionContext.Provider>
  );
}

describe('useQueryKeyBase — additionalHeaders', () => {
  it('keeps two header sets in separate cache entries under one QueryClient', async () => {
    const getVOTD = vi.fn().mockResolvedValue({ day: 1, passage_id: 'JHN.3.16' });
    const bibleClient = createBibleClientStub({ getVOTD });
    const queryClient = new QueryClient({ defaultOptions: queryClientDefaultOptions });

    render(
      <TestQueryClientProvider client={queryClient}>
        {rawHost({ 'X-YVP-Sdk': 'expo' }, bibleClient)}
        {rawHost({ 'X-YVP-Sdk': 'web' }, bibleClient)}
      </TestQueryClientProvider>,
    );

    // Each header set fetches for itself. One shared entry would send the first
    // set's headers and serve that response to both subtrees.
    await waitFor(() => {
      expect(getVOTD).toHaveBeenCalledTimes(2);
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it('gives identical headers one cache entry regardless of key order', async () => {
    const getVOTD = vi.fn().mockResolvedValue({ day: 1, passage_id: 'JHN.3.16' });
    const bibleClient = createBibleClientStub({ getVOTD });
    const queryClient = new QueryClient({ defaultOptions: queryClientDefaultOptions });

    render(
      <TestQueryClientProvider client={queryClient}>
        {rawHost({ a: '1', b: '2' }, bibleClient)}
        {rawHost({ b: '2', a: '1' }, bibleClient)}
      </TestQueryClientProvider>,
    );

    await waitFor(() => {
      expect(getVOTD).toHaveBeenCalledTimes(1);
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });
});

describe('useQueryKeyBase — version filters', () => {
  afterEach(() => {
    YouVersionPlatformConfiguration.permittedVersionIds = undefined;
    YouVersionPlatformConfiguration.excludedVersionIds = undefined;
    YouVersionPlatformConfiguration.permittedLanguageTags = undefined;
  });

  it('gives a tightened filter its own cache entry', async () => {
    const getVOTD = vi.fn().mockResolvedValue({ day: 1, passage_id: 'JHN.3.16' });
    const bibleClient = createBibleClientStub({ getVOTD });
    const queryClient = new QueryClient({ defaultOptions: queryClientDefaultOptions });

    const { rerender } = render(
      <TestQueryClientProvider client={queryClient}>
        {rawHost({ a: '1' }, bibleClient)}
      </TestQueryClientProvider>,
    );
    await waitFor(() => {
      expect(getVOTD).toHaveBeenCalledTimes(1);
    });

    // A provider that narrows the permitted versions must not keep serving the
    // entry cached under the looser filter.
    YouVersionPlatformConfiguration.permittedVersionIds = [111];
    rerender(
      <TestQueryClientProvider client={queryClient}>
        {rawHost({ a: '1' }, bibleClient)}
      </TestQueryClientProvider>,
    );

    await waitFor(() => {
      expect(getVOTD).toHaveBeenCalledTimes(2);
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
  });

  it('gives one filter one cache entry regardless of list order', async () => {
    const getVOTD = vi.fn().mockResolvedValue({ day: 1, passage_id: 'JHN.3.16' });
    const bibleClient = createBibleClientStub({ getVOTD });
    const queryClient = new QueryClient({ defaultOptions: queryClientDefaultOptions });

    YouVersionPlatformConfiguration.permittedVersionIds = [111, 206];
    const { rerender } = render(
      <TestQueryClientProvider client={queryClient}>
        {rawHost({ a: '1' }, bibleClient)}
      </TestQueryClientProvider>,
    );
    await waitFor(() => {
      expect(getVOTD).toHaveBeenCalledTimes(1);
    });

    YouVersionPlatformConfiguration.permittedVersionIds = [206, 111];
    rerender(
      <TestQueryClientProvider client={queryClient}>
        {rawHost({ a: '1' }, bibleClient)}
      </TestQueryClientProvider>,
    );

    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    expect(getVOTD).toHaveBeenCalledTimes(1);
  });
});
