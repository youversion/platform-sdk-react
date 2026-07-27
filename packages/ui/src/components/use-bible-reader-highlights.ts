'use client';

import { deriveHighlightedVerses } from '@/lib/highlight-projection';
import type { Highlight } from '@youversion/platform-core';
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
import { HIGHLIGHT_COLORS } from './verse-action-popover';

/**
 * Bridge-safe highlight intent emitted in controlled mode. Structurally
 * identical to `BibleReaderHighlightIntent` on `BibleReader` — kept local so
 * this adapter does not import from the compound component.
 */
export type BibleReaderHighlightIntentPayload = {
  versionId: number;
  book: string;
  chapter: string;
  verses: number[];
  passageIds: string[];
  color: string;
};

/**
 * Host-owned highlight slice (YPE-3705). When present, the adapter is fully
 * inert on the network: no fetch, no writes, pure projection from `highlights`,
 * and `apply` / `remove` forward intents to the host.
 */
export type ControlledHighlightsInput = {
  highlights: readonly Highlight[];
  onApply?: (intent: BibleReaderHighlightIntentPayload) => void;
  onRemove?: (intent: BibleReaderHighlightIntentPayload) => void;
};

export type UseBibleReaderHighlightsOptions = {
  versionId: number;
  book: string;
  chapter: string;
  /**
   * Host opt-in to the self-contained server path. Defaults to `false`: without
   * it there is no fetch, no writes, no dialogs, and nothing painted. Ignored
   * when `controlled` is set — handing over highlight data is its own opt-in.
   */
  enableHighlights?: boolean;
  /** Presence selects controlled mode (latched by the caller at first mount). */
  controlled?: ControlledHighlightsInput;
};

export type UseBibleReaderHighlightsReturn = {
  /** Verse number → hex color (lowercase, no `#`) for the current chapter. */
  highlightedVerses: Record<number, string>;
  /**
   * Highlights the given verses in `color`. Bridge-safe: primitives only.
   * When the user has a session and the highlights permission this writes
   * optimistically (`'applied'`); otherwise it opens the sign-in dialog (signed
   * out) or the just-in-time permission dialog (signed in, no permission) and
   * returns `'flow'`. Returns `'noop'` when highlighting is inert (host has not
   * opted in, no verses, or no auth provider). The caller uses the outcome to
   * decide whether to keep the verse selection: `'flow'` keeps it so cancelling
   * the dialog leaves the selection and popover intact.
   *
   * In controlled mode always emits an intent (no paint) and returns
   * `'applied'` so the caller clears the selection as usual.
   */
  apply: (color: string, verses: number[]) => 'applied' | 'flow' | 'noop';
  /** Clears the given verses that are currently highlighted in `color`. */
  remove: (color: string, verses: number[]) => void;
  /**
   * Whether the self-contained highlight path is actually live in this mount:
   * the host opted in (`enableHighlights`) AND a `YouVersionAuthProvider` is
   * present so a color tap can enter the auth flow and writes can reach the
   * API. `false` for copy/share-only integrators, where the machine sits in
   * `disabled` and taps resolve to `noop`.
   *
   * Deliberately excludes `isAuthenticated` — a signed-out tap still enters the
   * sign-in flow, so the row stays interactive. Same expression as the machine's
   * `isEnabledNow` guard, so the color row and the statechart provably agree.
   * Always `false` in controlled mode (which gates the row on the mode latch
   * instead). This is the seam's single enablement output; callers must not
   * re-derive it.
   */
  highlightsAvailable: boolean;
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

function buildHighlightIntent(
  versionId: number,
  book: string,
  chapter: string,
  color: string,
  verses: number[],
): BibleReaderHighlightIntentPayload {
  const sorted = [...new Set(verses)].filter((verse) => verse > 0).sort((a, b) => a - b);
  return {
    versionId,
    book,
    chapter,
    verses: sorted,
    passageIds: sorted.map((verse) => `${book}.${chapter}.${verse}`),
    color: color.toLowerCase(),
  };
}

/**
 * BibleReader's seam onto highlights (YPE-1034 self-contained + YPE-3705 controlled).
 *
 * **Self-contained:** a THIN adapter over `bibleReaderHighlightsMachine` (PR-288):
 * it reads auth + the host's opt-in + fetched highlights from React and feeds
 * them to the machine as events, exposes the machine's dialog states + write
 * commands, and derives the rendered verse map. All flow/write logic (optimistic
 * overlay, serialized writes, per-verse ownership, reconcile, auth flow, the
 * vapor fix) lives in the machine; see that file for the invariants and the
 * statechart. Rendering and fetching are gated on
 * `enableHighlights && isAuthenticated`. Without the opt-in, or with no auth
 * provider, the reader keeps the PR-1 posture: no fetch, no writes, and a color
 * tap never enters the auth flow — copy/share still work.
 *
 * **Controlled:** when `controlled` is set, the fetch stays disabled, the
 * machine is kept inert (`enableHighlights: false` — an enable guard, not a
 * statechart region), the render map is a pure projection of the host's
 * `highlights` (via `deriveHighlightedVerses`), and `apply` / `remove` emit
 * intents with no optimistic paint. Controlled mode ignores `enableHighlights`
 * — passing `highlights` is itself the opt-in (YPE-3705 ADR).
 */
export function useBibleReaderHighlights({
  versionId,
  book,
  chapter,
  enableHighlights = false,
  controlled,
}: UseBibleReaderHighlightsOptions): UseBibleReaderHighlightsReturn {
  const isControlled = controlled !== undefined;

  // Read the auth context directly instead of `useYVAuth`, which throws when no
  // auth provider is mounted. No provider and signed out are the same state
  // here for the self-contained path: no fetch, no writes, nothing rendered.
  const authContext = useContext(YouVersionAuthContext);
  const hasAuthProvider = authContext !== null;
  const isAuthenticated = Boolean(authContext?.userInfo);
  // Controlled mode keeps the machine disabled (provably inert) and never hits
  // the network — the host's opt-in only gates the self-contained server path.
  const optedIn = !isControlled && enableHighlights;
  const live = optedIn && isAuthenticated;

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

  // Stable refs so controlled apply/remove close over the latest callbacks
  // without re-creating the functions every render.
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;

  // A stable ref bag of the live SDK service closures. Passed once to the machine
  // via `input`; the machine reads `.current` at call time so it always sees the
  // latest closures without re-spawning. The ref is initialized with the first
  // render's services and then kept current each render (the "latest ref"
  // pattern) so freshness holds without a null-hole or re-spawn.
  const services: HighlightServices = {
    createHighlight,
    deleteHighlight,
    refetch,
    hasHighlightsPermission,
    invalidateHighlightsPermission,
    consumeDataExchangeReturn,
    startSignInForHighlights,
    startDataExchangeForHighlights,
  };
  const servicesRef = useRef(services);
  servicesRef.current = services;

  const scope: HighlightScope = useMemo(
    () => ({ versionId, book, chapter }),
    [versionId, book, chapter],
  );

  const actorRef = useActorRef(bibleReaderHighlightsMachine, {
    input: {
      services: servicesRef,
      scope,
      enableHighlights: optedIn,
      hasAuthProvider,
      isAuthenticated,
    },
  });

  // ── Feed React-owned inputs to the machine ──────────────────────────────────
  useEffect(() => {
    actorRef.send({
      type: 'AUTH_CHANGED',
      enableHighlights: optedIn,
      hasAuthProvider,
      isAuthenticated,
    });
  }, [actorRef, optedIn, hasAuthProvider, isAuthenticated]);

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
    // Controlled: pure projection from the host prop — no overlay, no fetch.
    // Colors outside the popover swatches are ignored so un-removable paint
    // cannot appear (YPE-3705).
    if (isControlled) {
      return deriveHighlightedVerses(
        controlled?.highlights ?? [],
        versionId,
        book,
        chapter,
        HIGHLIGHT_COLORS,
      );
    }

    // Gate on `live`: sign-out or a withdrawn opt-in must render nothing this
    // very render, including optimistic overlay entries still in the machine.
    if (!live) return {};
    // Only apply the overlay when the machine's scope matches the current one.
    // On a synchronous scope change (before the SCOPE_CHANGED effect runs) the
    // machine scope still points at the old chapter, so the overlay is skipped
    // and the new chapter renders from server truth alone — verse numbers
    // collide across chapters.
    if (!scopesEqual(machineScope, scope)) return { ...serverColors };
    return selectHighlightedVerses(serverColors, overlay);
  }, [
    isControlled,
    controlled?.highlights,
    live,
    serverColors,
    overlay,
    machineScope,
    scope,
    versionId,
    book,
    chapter,
  ]);

  const highlightedVersesRef = useRef(highlightedVerses);
  highlightedVersesRef.current = highlightedVerses;

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
        const controlledInput = controlledRef.current;
        if (controlledInput !== undefined) {
          if (verses.length === 0) return 'noop';
          // Emit intent only — no optimistic paint (YPE-3705 ADR).
          controlledInput.onApply?.(
            buildHighlightIntent(scope.versionId, scope.book, scope.chapter, color, verses),
          );
          return 'applied';
        }
        actorRef.send({ type: 'TAP_COLOR', color, verses });
        return actorRef.getSnapshot().context.lastTapOutcome;
      },
      remove: (color, verses) => {
        const controlledInput = controlledRef.current;
        if (controlledInput !== undefined) {
          if (verses.length === 0) return;
          // Only clear verses currently rendered in this color — that's the
          // popover's per-color X semantics.
          const normalizedColor = color.toLowerCase();
          const rendered = highlightedVersesRef.current;
          const targetVerses = verses.filter((verse) => rendered[verse] === normalizedColor);
          if (targetVerses.length === 0) return;
          controlledInput.onRemove?.(
            buildHighlightIntent(
              scope.versionId,
              scope.book,
              scope.chapter,
              normalizedColor,
              targetVerses,
            ),
          );
          return;
        }
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
    [actorRef, scope],
  );

  return {
    highlightedVerses,
    // The one enablement output, identical to the machine's `isEnabledNow`. The
    // caller renders the color row off this instead of re-deriving the opt-in.
    // (`live` also folds in `isAuthenticated`, which we intentionally exclude
    // here — a signed-out tap still enters the sign-in flow.)
    highlightsAvailable: optedIn && hasAuthProvider,
    permissionDialogOpen,
    signInDialogOpen,
    ...api,
  };
}
