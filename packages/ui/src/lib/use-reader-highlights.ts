'use client';

import { useHighlights, YouVersionAuthContext } from '@youversion/platform-react-hooks';
import { useCallback, useContext, useEffect, useState } from 'react';

type UseReaderHighlightsArgs = {
  versionId: number;
  book: string;
  chapter: string;
};

type UseReaderHighlightsResult = {
  /** Full passage_id (e.g. "JHN.3.16") -> 6-char lowercase hex, no `#`. */
  highlightsByPassageId: Record<string, string>;
  applyHighlight: (verses: number[], color: string) => void;
  removeHighlight: (verses: number[], color: string) => void;
};

/**
 * Encapsulates the reader's highlight state. When the user is signed in,
 * highlights load from and persist to the Highlights API (chapter-scoped); when
 * not signed in they are ephemeral session state (never persisted).
 *
 * Reads auth via the raw `YouVersionAuthContext` (null when no auth provider is
 * mounted) rather than `useYVAuth()`, which throws — the reader must keep
 * working for consumers who don't enable auth.
 *
 * Failure UX is intentionally out of scope: mutations apply optimistically and
 * log on error (no revert/toast). The subsequent refetch inside `useHighlights`
 * reconciles the store against the server (source of truth).
 */
export function useReaderHighlights({
  versionId,
  book,
  chapter,
}: UseReaderHighlightsArgs): UseReaderHighlightsResult {
  const authContext = useContext(YouVersionAuthContext);
  const userId = authContext?.userInfo?.userId ?? null;
  const isSignedIn = !!authContext?.userInfo;

  const chapterPassageId = `${book}.${chapter}`;
  const chapterPrefix = `${chapterPassageId}.`;

  const { highlights, createHighlight, deleteHighlight } = useHighlights(
    { version_id: versionId, passage_id: chapterPassageId },
    { enabled: isSignedIn },
  );

  // Optimistic, client-side view of the current scope's highlights.
  const [optimisticStore, setOptimisticStore] = useState<Record<string, string>>({});

  // Clear synchronously (during render) the moment the scope key changes, so the
  // previous version's colors for a shared passage_id (e.g. "JHN.3.16") can't
  // paint over the new scope for one frame before the fetch resolves. The user
  // identity is part of the key: signing out (userId -> null) or switching users
  // resets the store immediately, so one reader can't keep painting another
  // user's server-backed highlights until the next navigation/remount.
  const scopeKey = `${userId ?? 'signed-out'}:${versionId}:${chapterPassageId}`;
  const [loadedScopeKey, setLoadedScopeKey] = useState(scopeKey);
  if (loadedScopeKey !== scopeKey) {
    setLoadedScopeKey(scopeKey);
    setOptimisticStore({});
  }

  // Server is source of truth when signed in. Rebuild the store from the fetched
  // collection, filtered to the current scope so a stale collection (mid-refetch
  // after a scope change) can never leak another version's/chapter's entries.
  useEffect(() => {
    if (!isSignedIn || !highlights) return;
    const next: Record<string, string> = {};
    for (const highlight of highlights.data) {
      if (highlight.version_id !== versionId) continue;
      if (!highlight.passage_id.startsWith(chapterPrefix)) continue;
      next[highlight.passage_id] = highlight.color.toLowerCase();
    }
    setOptimisticStore(next);
  }, [isSignedIn, highlights, versionId, chapterPrefix]);

  const applyHighlight = useCallback(
    (verses: number[], color: string) => {
      setOptimisticStore((prev) => {
        const next = { ...prev };
        for (const verse of verses) next[`${chapterPrefix}${verse}`] = color;
        return next;
      });
      if (!isSignedIn) return;
      for (const verse of verses) {
        createHighlight({
          version_id: versionId,
          passage_id: `${chapterPrefix}${verse}`,
          color,
        }).catch(console.error);
      }
    },
    [isSignedIn, versionId, chapterPrefix, createHighlight],
  );

  const removeHighlight = useCallback(
    (verses: number[], color: string) => {
      // Compute the affected passages from current state before mutating, so the
      // API calls (a side effect) stay out of the state updater — which React
      // may invoke twice in StrictMode.
      const cleared = verses
        .map((verse) => `${chapterPrefix}${verse}`)
        .filter((passageId) => optimisticStore[passageId] === color);
      if (cleared.length === 0) return;

      setOptimisticStore((prev) => {
        const next = { ...prev };
        for (const passageId of cleared) delete next[passageId];
        return next;
      });
      if (!isSignedIn) return;
      for (const passageId of cleared) {
        deleteHighlight(passageId, { version_id: versionId }).catch(console.error);
      }
    },
    [optimisticStore, isSignedIn, versionId, chapterPrefix, deleteHighlight],
  );

  return { highlightsByPassageId: optimisticStore, applyHighlight, removeHighlight };
}
