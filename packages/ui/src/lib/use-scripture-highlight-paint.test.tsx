/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import type { Highlight } from '@youversion/platform-core';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { collection, Providers, stubUseHighlights } from '@/test/highlights-test-utils';
import {
  useScriptureHighlightPaint,
  type UseScriptureHighlightPaintOptions,
} from './use-scripture-highlight-paint';

const yellowRow: Highlight = { version_id: 111, passage_id: 'JHN.1.1', color: 'fffe00' };
const selfContainedOptions: UseScriptureHighlightPaintOptions = {
  highlights: undefined,
  isHighlightsControlled: false,
  highlightedVerses: undefined,
  versionId: 111,
  chapterScope: { book: 'JHN', chapter: '1' },
  displayPassageId: 'JHN.1',
};

function wrapper(userInfo?: null, hookOverrides?: HookOverrides) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Providers userInfo={userInfo === null ? null : undefined} hookOverrides={hookOverrides}>
        {children}
      </Providers>
    );
  };
}

describe('useScriptureHighlightPaint', () => {
  it('fetches and paints when signed in with permission and live, and disables fetch otherwise', () => {
    const fetched = stubUseHighlights({ highlights: collection([yellowRow]) });
    const hasPermission = vi
      .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
      .mockReturnValue(true);
    setHighlightsLive(true);

    try {
      const signedIn = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: wrapper(undefined, { useHighlights: fetched }),
      });
      expect(signedIn.result.current).toEqual({ 1: 'fffe00' });
      signedIn.unmount();

      const signedOut = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: wrapper(null),
      });
      expect(signedOut.result.current).toEqual({});
      signedOut.unmount();

      const noAuthProvider = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: ({ children }) => (
          <Providers userInfo={null} hookOverrides={undefined}>
            {children}
          </Providers>
        ),
      });
      expect(noAuthProvider.result.current).toEqual({});
      noAuthProvider.unmount();

      hasPermission.mockReturnValue(false);
      const noPermission = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: wrapper(),
      });
      expect(noPermission.result.current).toEqual({});
      noPermission.unmount();

      hasPermission.mockReturnValue(true);
      setHighlightsLive(false);
      const liveOff = renderHook(() => useScriptureHighlightPaint(selfContainedOptions), {
        wrapper: wrapper(),
      });
      expect(liveOff.result.current).toEqual({});
      liveOff.unmount();
    } finally {
      setHighlightsLive(HIGHLIGHTS_LIVE);
      hasPermission.mockRestore();
    }
  });

  it('paints a host array or a reader map without fetching', () => {
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
        { wrapper: wrapper() },
      );
      expect(controlled.result.current).toEqual({ 2: '5dff79' });
      controlled.unmount();

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
        { wrapper: wrapper() },
      );
      expect(readerSeam.result.current).toEqual({ 3: 'abcdef' });
    } finally {
      setHighlightsLive(HIGHLIGHTS_LIVE);
      hasPermission.mockRestore();
    }
  });

  it('clips fetched and host rows to a verse-unit display passage', () => {
    const fetchedOverride = stubUseHighlights({
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
        { wrapper: wrapper(undefined, { useHighlights: fetchedOverride }) },
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
        { wrapper: wrapper() },
      );
      expect(controlled.result.current).toEqual({ 1: 'fffe00' });

      const retainedChapter = renderHook(
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
            displayPassageId: 'JHN.2.3',
          }),
        { wrapper: wrapper() },
      );
      expect(retainedChapter.result.current).toEqual({
        1: 'fffe00',
        2: '5dff79',
        3: 'fffe00',
      });
    } finally {
      setHighlightsLive(HIGHLIGHTS_LIVE);
      hasPermission.mockRestore();
    }
  });
});
