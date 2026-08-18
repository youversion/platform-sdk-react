import { useContext, useMemo } from 'react';
import { YouVersionPlatformConfiguration, type Highlight } from '@youversion/platform-core';
import { useHighlights, YouVersionAuthContext } from '@youversion/platform-react-hooks';
import { isHighlightsLive } from '@/lib/feature-flags';
import {
  deriveHighlightedVerses,
  expandPassageId,
  filterHighlightsForPassage,
  type ChapterScope,
} from '@/lib/highlight-projection';

export type UseScriptureHighlightPaintOptions = {
  /** Host `highlights` prop. Presence is latched by the caller. */
  highlights: readonly Highlight[] | undefined;
  /** Latched at first mount via `useHighlightsControlledLatch`. */
  isHighlightsControlled: boolean;
  /**
   * Reader seam. BibleReader always passes this (even `{}`). When it is
   * defined, this hook must not fetch — the reader already owns `useHighlights`.
   */
  highlightedVerses: Record<number, string> | undefined;
  versionId: number;
  /** Paint/GET scope from `chapterScopeForHighlightPaint`. */
  chapterScope: ChapterScope | null;
  /**
   * Surface `reference` USFM. A verse or range unit clips host and fetched
   * rows to that passage so neighboring verses in chapter HTML do not paint.
   * Chapter-scope references skip the clip.
   */
  displayPassageId: string;
};

function projectHighlights(
  rows: readonly Highlight[],
  versionId: number,
  chapterScope: ChapterScope,
  displayPassageId: string,
): Record<number, string> {
  const toProject = expandPassageId(displayPassageId)
    ? filterHighlightsForPassage(rows, displayPassageId)
    : rows;
  return deriveHighlightedVerses(
    toProject,
    versionId,
    chapterScope.book,
    chapterScope.chapter,
  );
}

/**
 * Verse→color map for scripture surfaces that paint highlights without a
 * create/delete UI (BibleTextView, and therefore BibleCard / VerseOfTheDay).
 *
 * Dual posture, same split as BibleReader:
 * - **Controlled** (`isHighlightsControlled`): project the host array. No fetch.
 * - **Reader seam** (`highlightedVerses` defined): use that map. No fetch.
 * - **Self-contained**: fetch via `useHighlights` when signed in, the
 *   `highlights` permission is granted, highlights are live, and a chapter
 *   USFM + version id are available.
 *
 * `useHighlights` is always called (Rules of Hooks); `{ enabled: false }`
 * turns the GET off on every path that is not self-contained fetch.
 */
export function useScriptureHighlightPaint({
  highlights,
  isHighlightsControlled,
  highlightedVerses,
  versionId,
  chapterScope,
  displayPassageId,
}: UseScriptureHighlightPaintOptions): Record<number, string> {
  // Read auth directly instead of `useYVAuth`, which throws without a provider.
  // No provider and signed out are the same here: no fetch, no paint from API.
  const authContext = useContext(YouVersionAuthContext);
  const isAuthenticated = Boolean(authContext?.userInfo);
  const chapterUsfm = chapterScope ? `${chapterScope.book}.${chapterScope.chapter}` : '';
  const canFetch =
    !isHighlightsControlled &&
    highlightedVerses === undefined &&
    isAuthenticated &&
    YouVersionPlatformConfiguration.hasPermission('highlights') &&
    isHighlightsLive() &&
    versionId > 0 &&
    chapterScope !== null;

  const { highlights: fetchedHighlights } = useHighlights(
    { version_id: versionId, passage_id: chapterUsfm },
    { enabled: canFetch },
  );

  return useMemo(() => {
    if (isHighlightsControlled) {
      if (!chapterScope) return {};
      return projectHighlights(highlights ?? [], versionId, chapterScope, displayPassageId);
    }
    if (highlightedVerses !== undefined) {
      return highlightedVerses;
    }
    if (!canFetch || !chapterScope) return {};
    return projectHighlights(
      fetchedHighlights?.data ?? [],
      versionId,
      chapterScope,
      displayPassageId,
    );
  }, [
    isHighlightsControlled,
    highlights,
    highlightedVerses,
    canFetch,
    chapterScope,
    fetchedHighlights,
    versionId,
    displayPassageId,
  ]);
}
