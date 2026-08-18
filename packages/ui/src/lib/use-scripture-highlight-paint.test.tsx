/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import type { Collection, Highlight } from '@youversion/platform-core';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { useHighlights } from '@youversion/platform-react-hooks';
import { describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { collection, Providers, stubUseHighlights } from '@/test/highlights-test-utils';
import { useScriptureHighlightPaint } from './use-scripture-highlight-paint';

vi.mock('@youversion/platform-react-hooks', async () => {
  const actual = await vi.importActual('@youversion/platform-react-hooks');
  return {
    ...actual,
    useHighlights: vi.fn(),
  };
});

const yellowRow: Highlight = { version_id: 111, passage_id: 'JHN.1.1', color: 'fffe00' };
const selfContainedOptions = {
  highlights: undefined,
  isHighlightsControlled: false,
  highlightedVerses: undefined as Record<number, string> | undefined,
  versionId: 111,
  chapterScope: { book: 'JHN', chapter: '1' },
  displayPassageId: 'JHN.1',
};

describe('useScriptureHighlightPaint', () => {
  it('fetches and paints when signed in with permission and live, and disables fetch otherwise', () => {
    const fetched: Collection<Highlight> = collection([yellowRow]);
    stubUseHighlights({ highlights: fetched });
    const hasPermission = vi
      .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
      .mockReturnValue(true);
    setHighlightsLive(true);

    try {
      const signedIn = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: Providers,
      });
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: true },
      );
      expect(signedIn.result.current).toEqual({ 1: 'fffe00' });
      signedIn.unmount();

      vi.mocked(useHighlights).mockClear();
      const signedOut = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: ({ children }) => <Providers userInfo={null}>{children}</Providers>,
      });
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(signedOut.result.current).toEqual({});
      signedOut.unmount();

      vi.mocked(useHighlights).mockClear();
      const noProvider = renderHook(() => useScriptureHighlightPaint(selfContainedOptions));
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(noProvider.result.current).toEqual({});
      noProvider.unmount();

      hasPermission.mockReturnValue(false);
      vi.mocked(useHighlights).mockClear();
      const noPermission = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: Providers,
      });
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(noPermission.result.current).toEqual({});
      noPermission.unmount();

      hasPermission.mockReturnValue(true);
      setHighlightsLive(false);
      vi.mocked(useHighlights).mockClear();
      const liveOff = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: Providers,
      });
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(liveOff.result.current).toEqual({});
      liveOff.unmount();
    } finally {
      setHighlightsLive(HIGHLIGHTS_LIVE);
      hasPermission.mockRestore();
    }
  });

  it('paints a host array or a reader map without fetching', () => {
    stubUseHighlights({ highlights: collection([yellowRow]) });
    const hasPermission = vi
      .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
      .mockReturnValue(true);
    setHighlightsLive(true);

    try {
      const controlled = renderHook(
        () =>
          useScriptureHighlightPaint({
            highlights: [{ version_id: 111, passage_id: 'JHN.1.2', color: '5dff79' }],
            isHighlightsControlled: true,
            highlightedVerses: { 1: 'fffe00' },
            versionId: 111,
            chapterScope: { book: 'JHN', chapter: '1' },
            displayPassageId: 'JHN.1',
          }),
        { wrapper: Providers },
      );
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(controlled.result.current).toEqual({ 2: '5dff79' });
      controlled.unmount();

      vi.mocked(useHighlights).mockClear();
      const readerSeam = renderHook(
        () =>
          useScriptureHighlightPaint({
            highlights: undefined,
            isHighlightsControlled: false,
            highlightedVerses: { 3: 'abcdef' },
            versionId: 111,
            chapterScope: { book: 'JHN', chapter: '1' },
            displayPassageId: 'JHN.1',
          }),
        { wrapper: Providers },
      );
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(readerSeam.result.current).toEqual({ 3: 'abcdef' });
    } finally {
      setHighlightsLive(HIGHLIGHTS_LIVE);
      hasPermission.mockRestore();
    }
  });

  it('clips fetched and host rows to a verse-unit display passage', () => {
    stubUseHighlights({
      highlights: collection([{ version_id: 111, passage_id: 'JHN.1.1-3', color: 'fffe00' }]),
    });
    const hasPermission = vi
      .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
      .mockReturnValue(true);
    setHighlightsLive(true);

    try {
      const fetched = renderHook(
        () =>
          useScriptureHighlightPaint({
            ...selfContainedOptions,
            displayPassageId: 'JHN.1.1',
          }),
        { wrapper: Providers },
      );
      expect(fetched.result.current).toEqual({ 1: 'fffe00' });
      fetched.unmount();

      const controlled = renderHook(
        () =>
          useScriptureHighlightPaint({
            highlights: [
              { version_id: 111, passage_id: 'JHN.1.1-3', color: 'fffe00' },
              { version_id: 111, passage_id: 'JHN.1.2', color: '5dff79' },
            ],
            isHighlightsControlled: true,
            highlightedVerses: undefined,
            versionId: 111,
            chapterScope: { book: 'JHN', chapter: '1' },
            displayPassageId: 'JHN.1.1',
          }),
        { wrapper: Providers },
      );
      expect(controlled.result.current).toEqual({ 1: 'fffe00' });
    } finally {
      setHighlightsLive(HIGHLIGHTS_LIVE);
      hasPermission.mockRestore();
    }
  });
});
