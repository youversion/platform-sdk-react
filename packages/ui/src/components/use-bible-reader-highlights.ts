'use client';

import { isHighlightsLive } from '@/lib/feature-flags';
import {
  bibleReaderHighlightsMachine,
  scopesEqual,
  selectHighlightedVerses,
  type HighlightScope,
  type HighlightServices,
  type ServerColors,
} from './bible-reader-highlights-machine';
import {
  useHighlightAuthActions,
  useHighlights,
  YouVersionAuthContext,
} from '@youversion/platform-react-hooks';
import { useActorRef, useSelector } from '@xstate/react';
import { useContext, useEffect, useMemo, useRef } from 'react';

export type UseBibleReaderHighlightsOptions = {
  versionId: number;
  book: string;
  chapter: string;
};

export type UseBibleReaderHighlightsReturn = {
  /** Verse number → hex color (lowercase, no `#`) for the current chapter. */
  highlightedVerses: Record<number, string>;
  /**
   * Highlights the given verses in `color`. Bridge-safe: primitives only.
   * When the user has a session and the highlights permission this writes
   * optimistically (`'applied'`); otherwise it opens the sign-in dialog (signed
   * out) or the just-in-time permission dialog (signed in, no permission) and
   * returns `'flow'`. Returns `'noop'` when highlighting is inert (flag off, no
   * verses, or no auth provider). The caller uses the outcome to decide whether
   * to keep the verse selection: `'flow'` keeps it so cancelling the dialog
   * leaves the selection and popover intact.
   */
  apply: (color: string, verses: number[]) => 'applied' | 'flow' | 'noop';
  /** Clears the given verses that are currently highlighted in `color`. */
  remove: (color: string, verses: number[]) => void;
  /**
   * Whether highlighting can actually function in this mount — i.e. a
   * `YouVersionAuthProvider` is present so a color tap can enter the auth flow
   * and writes can reach the API. `false` for copy/share-only integrators (no
   * auth provider), where the machine sits in `disabled` and taps resolve to
   * `noop`. The caller ANDs this with the feature flag to decide whether to
   * render the (otherwise inert) color-swatch row.
   */
  highlightsInteractive: boolean;
  /** Whether the just-in-time permission confirm dialog is open. */
  permissionDialogOpen: boolean;
  /** Controlled open-change for the permission confirm dialog. */
  onPermissionDialogOpenChange: (open: boolean) => void;
  /** User accepted the dialog → start the data-exchange grant (full-page redirect). */
  confirmPermissionDialog: () => void;
  /** User declined/dismissed the dialog → discard the pending highlight. */
  cancelPermissionDialog: () => void;
  /** Whether the sign-in introduction dialog is open (signed-out color tap). */
  signInDialogOpen: boolean;
  /** User accepted the sign-in dialog → start the sign-in redirect. */
  confirmSignInDialog: () => void;
  /** User declined/dismissed the sign-in dialog → discard the pending highlight. */
  cancelSignInDialog: () => void;
};

/**
 * Parses the fetched highlights into a verse→color map for the current scope,
 * exactly as `selectHighlightedVerses` expects the server side.
 */
function parseServerColors(
  highlights: { data?: { version_id: number; passage_id: string; color: string }[] } | null,
  versionId: number,
  chapterUsfm: string,
): ServerColors {
  const map: ServerColors = {};
  const versePrefix = `${chapterUsfm}.`;
  for (const highlight of highlights?.data ?? []) {
    if (highlight.version_id !== versionId) continue;
    if (!highlight.passage_id.startsWith(versePrefix)) continue;
    const verse = parseInt(highlight.passage_id.slice(versePrefix.length), 10);
    if (verse > 0) map[verse] = highlight.color.toLowerCase();
  }
  return map;
}

function serverColorsEqual(a: ServerColors, b: ServerColors): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (a[Number(key)] !== b[Number(key)]) return false;
  }
  return true;
}

/**
 * BibleReader's seam onto the highlights API (YPE-1034, self-contained mode). A
 * THIN adapter over `bibleReaderHighlightsMachine` (PR-288): it reads auth +
 * flag + fetched highlights from React and feeds them to the machine as events,
 * exposes the machine's dialog states + write commands, and derives the rendered
 * verse map. All flow/write logic (optimistic overlay, serialized writes,
 * per-verse ownership, reconcile, auth flow, the vapor fix) lives in the
 * machine; see that file for the invariants and the statechart.
 *
 * Rendering and fetching are gated on `isHighlightsLive() && isAuthenticated`.
 * With no auth provider the reader keeps the PR-1 posture: no fetch, no writes,
 * and a color tap never enters the auth flow — copy/share still work.
 */
export function useBibleReaderHighlights({
  versionId,
  book,
  chapter,
}: UseBibleReaderHighlightsOptions): UseBibleReaderHighlightsReturn {
  // Read the auth context directly instead of `useYVAuth`, which throws when no
  // auth provider is mounted.
  const authContext = useContext(YouVersionAuthContext);
  const hasAuthProvider = authContext !== null;
  const isAuthenticated = Boolean(authContext?.userInfo);
  const flagOn = isHighlightsLive();
  const live = flagOn && isAuthenticated;

  const {
    hasHighlightsPermission,
    invalidateHighlightsPermission,
    consumeDataExchangeReturn,
    startSignInForHighlights,
    startDataExchangeForHighlights,
  } = useHighlightAuthActions();

  const chapterUsfm = `${book}.${chapter}`;
  const { highlights, createHighlight, deleteHighlight, refetch } = useHighlights(
    { version_id: versionId, passage_id: chapterUsfm },
    { enabled: live },
  );

  // A stable ref bag of the live SDK service closures. Passed once to the machine
  // via `input`; the machine reads `.current` at call time so it always sees the
  // latest closures without re-spawning.
  const servicesRef = useRef<HighlightServices>(null as unknown as HighlightServices);
  servicesRef.current = {
    createHighlight,
    deleteHighlight,
    refetch,
    hasHighlightsPermission,
    invalidateHighlightsPermission,
    consumeDataExchangeReturn,
    startSignInForHighlights,
    startDataExchangeForHighlights,
  };

  const scope: HighlightScope = useMemo(
    () => ({ versionId, book, chapter }),
    [versionId, book, chapter],
  );

  const actorRef = useActorRef(bibleReaderHighlightsMachine, {
    input: {
      services: servicesRef,
      scope,
      flagOn,
      hasAuthProvider,
      isAuthenticated,
    },
  });

  // ── Feed React-owned inputs to the machine ──────────────────────────────────
  useEffect(() => {
    actorRef.send({ type: 'AUTH_CHANGED', flagOn, hasAuthProvider, isAuthenticated });
  }, [actorRef, flagOn, hasAuthProvider, isAuthenticated]);

  useEffect(() => {
    actorRef.send({ type: 'SCOPE_CHANGED', scope });
  }, [actorRef, scope]);

  // Parse the fetch into server truth and forward it whenever it changes. The
  // machine reconciles the optimistic overlay against it.
  //
  // `useApiData` swaps `highlights` for a fresh object on every refetch, even
  // when the content is byte-identical. Parsing off that identity would mint a
  // new `serverColors` each time and cascade a new `highlightedVerses` reference
  // → a chapter-wide verse-style re-sweep (verse.tsx keys a useLayoutEffect on
  // it). Hold the prior parsed reference when the content is unchanged so the
  // downstream memos stay reference-stable across no-op refetches. (This is
  // separate from `lastSentServerColorsRef`, which dedups machine sends.)
  const parsedServerColorsRef = useRef<ServerColors | null>(null);
  const serverColors = useMemo(() => {
    const parsed = parseServerColors(highlights, versionId, chapterUsfm);
    const previous = parsedServerColorsRef.current;
    if (previous !== null && serverColorsEqual(previous, parsed)) {
      return previous;
    }
    parsedServerColorsRef.current = parsed;
    return parsed;
  }, [highlights, versionId, chapterUsfm]);
  const lastSentServerColorsRef = useRef<ServerColors | null>(null);
  useEffect(() => {
    if (
      lastSentServerColorsRef.current !== null &&
      serverColorsEqual(lastSentServerColorsRef.current, serverColors)
    ) {
      return;
    }
    lastSentServerColorsRef.current = serverColors;
    actorRef.send({ type: 'HIGHLIGHTS_UPDATED', serverColors });
  }, [actorRef, serverColors]);

  // ── Rendered verse map ──────────────────────────────────────────────────────
  const overlay = useSelector(actorRef, (state) => state.context.overlay);
  const machineScope = useSelector(actorRef, (state) => state.context.scope);
  const highlightedVerses = useMemo(() => {
    // Gate on `live`: sign-out or flag-off must render nothing this very render,
    // including optimistic overlay entries still in the machine.
    if (!live) return {};
    // Only apply the overlay when the machine's scope matches the current one.
    // On a synchronous scope change (before the SCOPE_CHANGED effect runs) the
    // machine scope still points at the old chapter, so the overlay is skipped
    // and the new chapter renders from server truth alone — verse numbers
    // collide across chapters.
    if (!scopesEqual(machineScope, scope)) return { ...serverColors };
    return selectHighlightedVerses(serverColors, overlay);
  }, [live, serverColors, overlay, machineScope, scope]);

  // ── Dialog state + commands ─────────────────────────────────────────────────
  const signInDialogOpen = useSelector(actorRef, (state) =>
    state.matches({ enabled: { flow: 'signInDialog' } }),
  );
  const permissionDialogOpen = useSelector(actorRef, (state) =>
    state.matches({ enabled: { flow: 'permissionDialog' } }),
  );

  const api = useMemo<
    Pick<
      UseBibleReaderHighlightsReturn,
      | 'apply'
      | 'remove'
      | 'onPermissionDialogOpenChange'
      | 'confirmPermissionDialog'
      | 'cancelPermissionDialog'
      | 'confirmSignInDialog'
      | 'cancelSignInDialog'
    >
  >(
    () => ({
      apply: (color, verses) => {
        actorRef.send({ type: 'TAP_COLOR', color, verses });
        return actorRef.getSnapshot().context.lastTapOutcome;
      },
      remove: (color, verses) => {
        actorRef.send({ type: 'REMOVE', color, verses });
      },
      onPermissionDialogOpenChange: (open) => {
        // Dismiss via outside-click / Escape is a decline: discard the pending
        // highlight but leave the verse selection untouched (the caller owns it).
        if (!open) actorRef.send({ type: 'CANCEL_PERMISSION' });
      },
      confirmPermissionDialog: () => actorRef.send({ type: 'CONFIRM_PERMISSION' }),
      cancelPermissionDialog: () => actorRef.send({ type: 'CANCEL_PERMISSION' }),
      confirmSignInDialog: () => actorRef.send({ type: 'CONFIRM_SIGN_IN' }),
      cancelSignInDialog: () => actorRef.send({ type: 'DECLINE_SIGN_IN' }),
    }),
    [actorRef],
  );

  return {
    highlightedVerses,
    // Interactivity mirrors the machine's enabled/disabled gate: with no auth
    // provider the machine is inert and the color row must not render. The flag
    // is ANDed in by the caller. (`live` also folds in `isAuthenticated`, which
    // we intentionally exclude here — a signed-out tap still enters the sign-in
    // flow, so the row stays interactive.)
    highlightsInteractive: hasAuthProvider,
    permissionDialogOpen,
    signInDialogOpen,
    ...api,
  };
}
