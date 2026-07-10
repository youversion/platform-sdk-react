'use client';

import { isHighlightsLive } from '@/lib/feature-flags';
import { buildPassageIds } from '@/lib/usfm-ranges';
import { useHighlights, YouVersionAuthContext } from '@youversion/platform-react-hooks';
import { Result } from 'better-result';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type UseBibleReaderHighlightsOptions = {
  versionId: number;
  book: string;
  chapter: string;
};

export type UseBibleReaderHighlightsReturn = {
  /** Verse number → hex color (lowercase, no `#`) for the current chapter. */
  highlightedVerses: Record<number, string>;
  /** Highlights the given verses in `color`. Bridge-safe: primitives only. */
  apply: (color: string, verses: number[]) => void;
  /** Clears the given verses that are currently highlighted in `color`. */
  remove: (color: string, verses: number[]) => void;
};

/**
 * Optimistic per-verse overlay on top of the fetched highlights: a hex color
 * means "optimistically applied", `null` means "optimistically removed".
 */
type HighlightOverlay = Record<number, string | null>;

/**
 * The error type this hook's write boundary converts to. Core clients throw;
 * we catch here (via better-result) so a failed write can never take the
 * reader down — the failure is logged and the optimistic overlay reverted.
 */
class BibleReaderHighlightError extends Error {
  readonly operation: 'apply' | 'remove';
  readonly passageId: string;
  readonly cause: unknown;

  constructor(operation: 'apply' | 'remove', passageId: string, cause: unknown) {
    super(`Highlight ${operation} failed for ${passageId}`);
    this.name = 'BibleReaderHighlightError';
    this.operation = operation;
    this.passageId = passageId;
    this.cause = cause;
  }
}

function snapshotOverlay(overlay: HighlightOverlay, verses: number[]): HighlightOverlay {
  const snapshot: HighlightOverlay = {};
  for (const verse of verses) {
    if (verse in overlay) snapshot[verse] = overlay[verse]!;
  }
  return snapshot;
}

/**
 * BibleReader's seam onto the highlights API (YPE-1034, self-contained mode).
 *
 * Highlights are server-only account data: fetched per chapter through
 * `useHighlights`, written as collapsed range USFMs, rendered through an
 * in-memory optimistic overlay. There is no local persistence (ADR-001 in
 * docs/adr/YPE-1034-highlights-server-only.md).
 *
 * Everything is gated on `isHighlightsLive() && isAuthenticated`: while the
 * dark-launch flag is off, or the user has no session, the hook is inert — no
 * fetches, no writes, an empty rendered map. Failures in this PR get a
 * `console.error` and an overlay revert only; toasts and 401/403 handling are
 * PR 2.
 */
export function useBibleReaderHighlights({
  versionId,
  book,
  chapter,
}: UseBibleReaderHighlightsOptions): UseBibleReaderHighlightsReturn {
  // Read the auth context directly instead of `useYVAuth`, which throws when
  // the consumer never mounted an auth provider. No provider and signed out
  // are the same state here: no fetch, no writes, nothing rendered.
  const authContext = useContext(YouVersionAuthContext);
  const isAuthenticated = Boolean(authContext?.userInfo);
  const live = isHighlightsLive() && isAuthenticated;

  const chapterUsfm = `${book}.${chapter}`;
  const { highlights, createHighlight, deleteHighlight } = useHighlights(
    { version_id: versionId, passage_id: chapterUsfm },
    { enabled: live },
  );

  const [overlay, setOverlay] = useState<HighlightOverlay>({});

  // Drop the optimistic overlay synchronously (during render) the moment the
  // scope changes, so an in-flight overlay never paints over another
  // chapter's or version's verses — their verse numbers collide.
  const overlayScope = `${versionId}:${chapterUsfm}`;
  const [loadedOverlayScope, setLoadedOverlayScope] = useState(overlayScope);
  if (loadedOverlayScope !== overlayScope) {
    setLoadedOverlayScope(overlayScope);
    setOverlay({});
  }

  const highlightedVerses = useMemo(() => {
    // Gate on `live` here too (useApiData also clears data when disabled):
    // sign-out or flag-off must render nothing this very render, including
    // any optimistic overlay entries still in state.
    if (!live) return {};

    const map: Record<number, string> = {};
    const versePrefix = `${chapterUsfm}.`;
    // The API returns one highlight per verse (no ranges) — parse the verse
    // number off the chapter prefix and normalize color case for rendering.
    for (const highlight of highlights?.data ?? []) {
      if (highlight.version_id !== versionId) continue;
      if (!highlight.passage_id.startsWith(versePrefix)) continue;
      const verse = parseInt(highlight.passage_id.slice(versePrefix.length), 10);
      if (verse > 0) map[verse] = highlight.color.toLowerCase();
    }
    for (const [verse, color] of Object.entries(overlay)) {
      if (color === null) delete map[Number(verse)];
      else map[Number(verse)] = color;
    }
    return map;
  }, [live, highlights, overlay, chapterUsfm, versionId]);

  // Refs so `apply` / `remove` can snapshot current state without re-memoizing
  // on every overlay/fetch change.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const highlightedVersesRef = useRef(highlightedVerses);
  highlightedVersesRef.current = highlightedVerses;

  // Verses whose write settled successfully and are awaiting the post-write
  // refetch. Once fresh data lands, their overlay entries are dropped so the
  // server's truth wins again — otherwise a successful write's overlay entry
  // would mask every later server-side change to that verse (another device,
  // another tab) until navigation.
  const confirmedVersesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (confirmedVersesRef.current.size === 0) return;
    const confirmed = confirmedVersesRef.current;
    confirmedVersesRef.current = new Set();
    setOverlay((current) => {
      let changed = false;
      const next = { ...current };
      for (const verse of confirmed) {
        if (verse in next) {
          delete next[verse];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [highlights]);

  const patchOverlay = useCallback((verses: number[], value: string | null) => {
    setOverlay((current) => {
      const next = { ...current };
      for (const verse of verses) next[verse] = value;
      return next;
    });
  }, []);

  const revertOverlay = useCallback((verses: number[], snapshot: HighlightOverlay) => {
    setOverlay((current) => {
      const next = { ...current };
      for (const verse of verses) {
        if (verse in snapshot) next[verse] = snapshot[verse]!;
        else delete next[verse];
      }
      return next;
    });
  }, []);

  // Known concurrency windows at this apply/remove boundary. Deliberately not
  // closed in PR 1 — a real per-verse operation queue is PR 2 territory:
  //
  // - Apply then remove the same verse while the POST is still in flight: the
  //   DELETE can reach the server before the create commits, leaving a
  //   server-side highlight that renders as removed until the next refetch or
  //   navigation repaints it.
  // - Two overlapping writes touching the same verses: the loser's
  //   snapshot-based failure revert can transiently clobber the winner's
  //   optimistic entry (rendering converges once the post-write refetch
  //   lands, since useApiData is latest-wins).
  //
  // The confirmed-verse clearing above narrows both windows — a settled
  // write's overlay entry stops shadowing server truth as soon as fresh data
  // arrives — but does not close them.
  const apply = useCallback(
    (color: string, verses: number[]) => {
      if (!live || verses.length === 0) return;

      const normalizedColor = color.toLowerCase();
      const snapshot = snapshotOverlay(overlayRef.current, verses);
      patchOverlay(verses, normalizedColor);

      void (async () => {
        const results = await Promise.all(
          buildPassageIds(book, chapter, verses).map((passageId) =>
            Result.tryPromise({
              try: () =>
                createHighlight({
                  version_id: versionId,
                  passage_id: passageId,
                  color: normalizedColor,
                }),
              catch: (cause) => new BibleReaderHighlightError('apply', passageId, cause),
            }),
          ),
        );

        const failures = results.filter(Result.isError);
        if (failures.length === 0) {
          // Hand the verses to the confirmed set: the refetch createHighlight
          // triggered will clear their overlay entries when its data lands.
          for (const verse of verses) confirmedVersesRef.current.add(verse);
          return;
        }
        for (const failure of failures) {
          console.error(
            `[YouVersion SDK] Failed to apply highlight (version ${versionId}, ` +
              `passage ${failure.error.passageId}, color ${normalizedColor})`,
            failure.error,
          );
        }
        // Partial failures revert the whole optimistic batch; the refetch that
        // any successful create triggered repaints the server's truth.
        revertOverlay(verses, snapshot);
      })();
    },
    [live, book, chapter, versionId, createHighlight, patchOverlay, revertOverlay],
  );

  const remove = useCallback(
    (color: string, verses: number[]) => {
      if (!live || verses.length === 0) return;

      // Only clear verses currently rendered in this color — that's the
      // popover's per-color X semantics. (The DELETE endpoint clears any color
      // in the range, so the passage ids must not span other colors.)
      const normalizedColor = color.toLowerCase();
      const rendered = highlightedVersesRef.current;
      const targetVerses = verses.filter((verse) => rendered[verse] === normalizedColor);
      if (targetVerses.length === 0) return;

      const snapshot = snapshotOverlay(overlayRef.current, targetVerses);
      patchOverlay(targetVerses, null);

      void (async () => {
        const results = await Promise.all(
          buildPassageIds(book, chapter, targetVerses).map((passageId) =>
            Result.tryPromise({
              try: () => deleteHighlight(passageId, { version_id: versionId }),
              catch: (cause) => new BibleReaderHighlightError('remove', passageId, cause),
            }),
          ),
        );

        const failures = results.filter(Result.isError);
        if (failures.length === 0) {
          for (const verse of targetVerses) confirmedVersesRef.current.add(verse);
          return;
        }
        for (const failure of failures) {
          console.error(
            `[YouVersion SDK] Failed to remove highlight (version ${versionId}, ` +
              `passage ${failure.error.passageId}, color ${normalizedColor})`,
            failure.error,
          );
        }
        revertOverlay(targetVerses, snapshot);
      })();
    },
    [live, book, chapter, versionId, deleteHighlight, patchOverlay, revertOverlay],
  );

  return { highlightedVerses, apply, remove };
}
