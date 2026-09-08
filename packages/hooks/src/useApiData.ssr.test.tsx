/**
 * @vitest-environment node
 *
 * SSR smoke for the TanStack Query read layer: `renderToString` must neither
 * crash (no window, no storage) nor fire a network request — queries only
 * fetch from the effect-driven subscription, which never runs on the server.
 */
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as core from '@youversion/platform-core';
import { YouVersionProvider } from './context/YouVersionProvider';
import { useChapter } from './useChapter';

function Chapter() {
  const { chapter, loading } = useChapter(111, 'MAT', 1);
  if (loading) return <p>loading</p>;
  return <p>{chapter?.title}</p>;
}

describe('useApiData — server-side rendering', () => {
  it('renders the loading state without crashing or fetching', () => {
    const getChapter = vi
      .spyOn(core, 'getChapter')
      .mockRejectedValue(new Error('must not be called during SSR'));

    const html = renderToString(
      <YouVersionProvider appKey="test-app-key">
        <Chapter />
      </YouVersionProvider>,
    );

    expect(html).toContain('loading');
    expect(getChapter).not.toHaveBeenCalled();
    getChapter.mockRestore();
  });
});
