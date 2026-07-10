'use client';

import { isHighlightsLive } from '@/lib/feature-flags';
import {
  clearPendingHighlight,
  readPendingHighlight,
  stashPendingHighlight,
} from '@/lib/pending-highlight';
import { buildPassageIds } from '@/lib/usfm-ranges';
import {
  useHighlightAuthActions,
  useHighlights,
  YouVersionAuthContext,
} from '@youversion/platform-react-hooks';
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
  /**
   * The user's recent highlight colors (recently used first, then defaults) as
   * hex strings, or `null` when unavailable — highlights off, no session, or the
   * fetch hasn't resolved / failed. The color row falls back to its default
   * palette while this is `null`. Server-ordered; not normalized here.
   */
  recentColors: string[] | null;
  /**
   * Highlights the given verses in `color`. Bridge-safe: primitives only.
   * When the user has a session and the highlights permission this writes
   * optimistically (`'applied'`); otherwise it stashes a pending highlight and
   * enters the highlight auth flow (`'flow'` — sign-in redirect or the
   * permission confirm dialog). Returns `'noop'` when highlighting is inert
   * (flag off, no verses, or no auth provider). The caller uses the outcome to
   * decide whether to keep the verse selection: `'flow'` keeps it so cancelling
   * the dialog leaves the selection and popover intact.
   */
  apply: (color: string, verses: number[]) => 'applied' | 'flow' | 'noop';
  /** Clears the given verses that are currently highlighted in `color`. */
  remove: (color: string, verses: number[]) => void;
  /** Whether the just-in-time permission confirm dialog is open. */
  permissionDialogOpen: boolean;
  /** Controlled open-change for the permission confirm dialog. */
  onPermissionDialogOpenChange: (open: boolean) => void;
  /** User accepted the dialog → start the data-exchange grant (full-page redirect). */
  confirmPermissionDialog: () => void;
  /** User declined/dismissed the dialog → discard the pending highlight. */
  cancelPermissionDialog: () => void;
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

/** Pulls an HTTP status off a thrown ApiClient error (possibly wrapped). */
function extractStatus(error: unknown): number | undefined {
  if (error instanceof BibleReaderHighlightError) return extractStatus(error.cause);
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/**
 * A 401/403 means the app lost (or never had) the highlights permission.
 *
 * DEFERRED (accepted for dark launch): a 401 from an *expired token* (not a
 * missing permission) also lands here and misroutes to the permission
 * re-prompt instead of a token refresh / re-auth. Follow-up: distinguish
 * auth-expiry from permission-denied at this boundary.
 */
function isPermissionError(error: unknown): boolean {
  const status = extractStatus(error);
  return status === 401 || status === 403;
}

/**
 * BibleReader's seam onto the highlights API (YPE-1034, self-contained mode).
 *
 * Highlights are server-only account data: fetched per chapter through
 * `useHighlights`, written as collapsed range USFMs, rendered through an
 * in-memory optimistic overlay. There is no local persistence (ADR-001 in
 * docs/adr/YPE-1034-highlights-server-only.md).
 *
 * Rendering and fetching are gated on `isHighlightsLive() && isAuthenticated`.
 * Writing additionally requires the `highlights` permission; when it (or the
 * session) is missing, a color tap stashes a pending highlight and enters the
 * highlight auth flow instead — one-fell-swoop sign-in when signed out, or the
 * just-in-time permission confirm dialog → data-exchange grant when signed in.
 *
 * Apply/remove writes are serialized through a single FIFO promise chain so a
 * later operation can never race an earlier one to the server (e.g. a DELETE
 * overtaking an in-flight POST for the same verse). A per-verse ownership token
 * guarantees a failed write only reverts verses no newer operation has claimed,
 * so overlapping writes settle to the last-issued operation's state.
 */
export function useBibleReaderHighlights({
  versionId,
  book,
  chapter,
}: UseBibleReaderHighlightsOptions): UseBibleReaderHighlightsReturn {
  // Read the auth context directly instead of `useYVAuth`, which throws when
  // the consumer never mounted an auth provider. With no provider we keep the
  // PR 1 posture: no fetch, no writes, and a color tap never enters the auth
  // flow (there is no auth to run) — copy/share still work.
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
  const { highlights, createHighlight, deleteHighlight, getRecentColors, refetch } = useHighlights(
    { version_id: versionId, passage_id: chapterUsfm },
    { enabled: live },
  );

  const [overlay, setOverlay] = useState<HighlightOverlay>({});
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);

  // The user's recent highlight colors, fetched once the feature is live. `null`
  // means "use the default palette": the feature is inert, or the fetch is still
  // pending or failed. Recent colors are user-global (not per chapter/version),
  // so they're fetched on the `live` edge only — never per navigation or per tap.
  //
  // DEFERRED (accepted for dark launch): an account switch WITHOUT an
  // intervening sign-out (userInfo A → userInfo B while `live` stays true)
  // never re-runs this effect, so user A's recents stay rendered for user B.
  // Hosts normally sign out between users, which drops recents via the `!live`
  // branch. Follow-up: key the fetch on the user identity as well as `live`.
  const [recentColors, setRecentColors] = useState<string[] | null>(null);
  const getRecentColorsRef = useRef(getRecentColors);
  getRecentColorsRef.current = getRecentColors;
  useEffect(() => {
    if (!live) {
      // Sign-out / flag-off must drop recents synchronously-ish so the row falls
      // back to the palette rather than showing another session's colors.
      setRecentColors(null);
      return;
    }
    let cancelled = false;
    getRecentColorsRef
      .current()
      .then((colors) => {
        if (!cancelled) setRecentColors(colors);
      })
      .catch(() => {
        // A failed/forbidden fetch is non-fatal: keep `null` so the row renders
        // the default palette. (Signed-in-without-permission 403s land here.)
        if (!cancelled) setRecentColors(null);
      });
    return () => {
      cancelled = true;
    };
  }, [live]);

  // Writes that settled successfully but whose optimistic overlay is held until
  // a fetch REFLECTS the write. Maps verse → what we wrote:
  //   { op: 'apply', color }  — reflected when the GET shows the verse in `color`
  //   { op: 'remove', color } — reflected when the GET no longer shows `color`
  // Until a fetch reflects the write the overlay wins, so read-after-write lag
  // (staging slowness, prod read replicas) can't flicker a highlight out then
  // back (apply) or resurrect a removed one (remove). See the reconcile effect.
  const pendingReconcileRef = useRef<Map<number, { op: 'apply' | 'remove'; color: string }>>(
    new Map(),
  );

  // Drop the optimistic overlay synchronously (during render) the moment the
  // scope changes, so an in-flight overlay never paints over another
  // chapter's or version's verses — their verse numbers collide.
  const overlayScope = `${versionId}:${chapterUsfm}`;
  const [loadedOverlayScope, setLoadedOverlayScope] = useState(overlayScope);
  if (loadedOverlayScope !== overlayScope) {
    setLoadedOverlayScope(overlayScope);
    setOverlay({});
    // Verse numbers collide across scopes, so any write awaiting reconciliation
    // in the old chapter/version must not retire (or hold) an overlay entry in
    // the new one. This is also the escape hatch that stops a never-converging
    // write from pinning the overlay forever: navigating away drops it.
    pendingReconcileRef.current = new Map();
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

  // Refs so callbacks can snapshot current state without re-memoizing on every
  // overlay/fetch change.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const highlightedVersesRef = useRef(highlightedVerses);
  highlightedVersesRef.current = highlightedVerses;

  // Reconcile the optimistic overlay against freshly fetched server truth.
  // A pending write's overlay entry is retired ONLY once the fetch reflects that
  // write (apply → the verse shows the written color; remove → the verse no
  // longer shows the removed color). Until then the overlay wins, so a GET that
  // lands before the write is visible server-side (read-after-write lag) leaves
  // the user's highlight painted instead of flickering it out and back.
  //
  // A retired entry drops its overlay slot so server truth renders again —
  // otherwise a write's overlay would mask every later server-side change to
  // that verse (another device/tab) until navigation. Entries the server never
  // converges on are released by the reset paths (scope change clears this map +
  // the overlay; sign-out drops fetched data), never by a timer.
  useEffect(() => {
    if (pendingReconcileRef.current.size === 0) return;

    // Server truth for this scope, parsed exactly like `highlightedVerses`.
    const serverColors = new Map<number, string>();
    const versePrefix = `${chapterUsfm}.`;
    for (const highlight of highlights?.data ?? []) {
      if (highlight.version_id !== versionId) continue;
      if (!highlight.passage_id.startsWith(versePrefix)) continue;
      const verse = parseInt(highlight.passage_id.slice(versePrefix.length), 10);
      if (verse > 0) serverColors.set(verse, highlight.color.toLowerCase());
    }

    const retired: number[] = [];
    for (const [verse, entry] of pendingReconcileRef.current) {
      const serverColor = serverColors.get(verse);
      const reflected =
        entry.op === 'apply' ? serverColor === entry.color : serverColor !== entry.color;
      if (reflected) retired.push(verse);
    }
    if (retired.length === 0) return;

    for (const verse of retired) pendingReconcileRef.current.delete(verse);
    setOverlay((current) => {
      let changed = false;
      const next = { ...current };
      for (const verse of retired) {
        if (verse in next) {
          delete next[verse];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [highlights, chapterUsfm, versionId]);

  const patchOverlay = useCallback((verses: number[], value: string | null) => {
    setOverlay((current) => {
      const next = { ...current };
      for (const verse of verses) next[verse] = value;
      return next;
    });
  }, []);

  // Per-verse ownership: each write claims its verses with a fresh token. A
  // failed write only reverts (drops the optimistic entry, letting server truth
  // show) verses it still owns — if a newer write re-claimed a verse, the newer
  // write owns its final state. This closes the "loser clobbers winner" window.
  const writeIntentRef = useRef<Map<number, object>>(new Map());

  const claimVerses = useCallback((verses: number[]): object => {
    const token = {};
    for (const verse of verses) {
      writeIntentRef.current.set(verse, token);
      // A newer write supersedes any older reconciliation still pending for this
      // verse: drop the stale expectation so the reconcile effect can't retire
      // (or hold) the fresh optimistic overlay against the old write's target.
      // The new write re-registers its own expectation when it settles.
      pendingReconcileRef.current.delete(verse);
    }
    return token;
  }, []);

  const revertOwned = useCallback((verses: number[], token: object) => {
    setOverlay((current) => {
      let changed = false;
      const next = { ...current };
      for (const verse of verses) {
        if (writeIntentRef.current.get(verse) === token && verse in next) {
          delete next[verse];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  // Single FIFO promise chain serializing every apply/remove write. `.then` on
  // both fulfil and reject keeps the chain alive past a failed operation.
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueWrite = useCallback((task: () => Promise<void>) => {
    const run = writeQueueRef.current.then(task, task);
    writeQueueRef.current = run;
    return run;
  }, []);

  // Stable refs for values the queued tasks and the resume effect read, so those
  // callbacks don't need to re-create on every render.
  const scopeRef = useRef({ versionId, book, chapter });
  scopeRef.current = { versionId, book, chapter };
  const createHighlightRef = useRef(createHighlight);
  createHighlightRef.current = createHighlight;
  // One refetch per settled batch (Fix 3): the hooks layer no longer refetches
  // per write, so a multi-run apply / multi-verse remove issues a single GET.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const authActionsRef = useRef({
    invalidateHighlightsPermission,
    startDataExchangeForHighlights,
  });
  authActionsRef.current = { invalidateHighlightsPermission, startDataExchangeForHighlights };

  const logWriteFailures = useCallback(
    (failures: BibleReaderHighlightError[], color: string) => {
      for (const failure of failures) {
        console.error(
          `[YouVersion SDK] Failed to ${failure.operation} highlight (version ${versionId}, ` +
            `passage ${failure.passageId}, color ${color})`,
          failure,
        );
      }
    },
    [versionId],
  );

  const runApply = useCallback(
    async (color: string, verses: number[], token: object) => {
      const results = await Promise.all(
        buildPassageIds(book, chapter, verses).map((passageId) =>
          Result.tryPromise({
            try: () =>
              createHighlightRef.current({ version_id: versionId, passage_id: passageId, color }),
            catch: (cause) => new BibleReaderHighlightError('apply', passageId, cause),
          }),
        ),
      );

      const failures = results.filter(Result.isError).map((r) => r.error);
      if (failures.length === 0) {
        for (const verse of verses) {
          if (writeIntentRef.current.get(verse) === token) {
            pendingReconcileRef.current.set(verse, { op: 'apply', color });
          }
        }
        // One GET for the whole batch; the reconcile effect retires the overlay
        // entries once this fetch (or a later one) reflects the write.
        refetchRef.current();
        return;
      }

      logWriteFailures(failures, color);
      revertOwned(verses, token);

      if (failures.some(isPermissionError)) {
        // Server says the permission is gone (or never applied): invalidate the
        // optimistic cache, keep this highlight as pending, and re-prompt.
        authActionsRef.current.invalidateHighlightsPermission();
        const scope = scopeRef.current;
        stashPendingHighlight({
          verses,
          color,
          versionId: scope.versionId,
          book: scope.book,
          chapter: scope.chapter,
          timestamp: Date.now(),
        });
        setPermissionDialogOpen(true);
      } else {
        // Network / 5xx: overlay already reverted; drop any pending intent.
        clearPendingHighlight();
      }
    },
    [book, chapter, versionId, logWriteFailures, revertOwned],
  );

  const runRemove = useCallback(
    async (color: string, verses: number[], token: object) => {
      // DELETE per verse, NOT per contiguous run (Fix 4): the API stores
      // highlights per verse and returned a non-2xx for range delete on staging
      // (e.g. `JHN.1.2-3`), so a range passage-id would throw and leave the
      // removal un-persisted. POST/apply still collapses to ranges — that works.
      const results = await Promise.all(
        verses.map((verse) => {
          const passageId = `${book}.${chapter}.${verse}`;
          return Result.tryPromise({
            try: () => deleteHighlight(passageId, { version_id: versionId }),
            catch: (cause) => new BibleReaderHighlightError('remove', passageId, cause),
          });
        }),
      );

      const failures = results.filter(Result.isError).map((r) => r.error);
      if (failures.length === 0) {
        for (const verse of verses) {
          if (writeIntentRef.current.get(verse) === token) {
            pendingReconcileRef.current.set(verse, { op: 'remove', color });
          }
        }
        // Single GET for the whole (possibly multi-verse) removal.
        refetchRef.current();
        return;
      }

      logWriteFailures(failures, color);
      revertOwned(verses, token);

      if (failures.some(isPermissionError)) {
        authActionsRef.current.invalidateHighlightsPermission();
        // DEFERRED: a remove failure has no pending highlight, so the dialog's
        // post-grant resume is a no-op — the user grants and nothing visibly
        // happens. Follow-up: don't re-prompt on remove failures (invalidating
        // the cache above is enough; the next apply re-enters the flow).
        setPermissionDialogOpen(true);
      }
    },
    [book, chapter, versionId, deleteHighlight, logWriteFailures, revertOwned],
  );

  const apply = useCallback(
    (color: string, verses: number[]): 'applied' | 'flow' | 'noop' => {
      if (!flagOn || verses.length === 0 || !hasAuthProvider) return 'noop';

      const normalizedColor = color.toLowerCase();

      // Authorized write: optimistic paint now, serialized POST behind the queue.
      if (isAuthenticated && hasHighlightsPermission()) {
        const token = claimVerses(verses);
        patchOverlay(verses, normalizedColor);
        void enqueueWrite(() => runApply(normalizedColor, verses, token));
        return 'applied';
      }

      // Enter the highlight auth flow: stash the intent so it survives a redirect
      // round-trip (sign-in) or resumes after the confirm dialog's grant.
      stashPendingHighlight({
        verses,
        color: normalizedColor,
        versionId,
        book,
        chapter,
        timestamp: Date.now(),
      });

      if (!isAuthenticated) {
        // One-fell-swoop: full-page redirect to sign-in requesting `highlights`.
        void startSignInForHighlights().catch((error) => {
          console.error('[YouVersion SDK] Failed to start sign-in for highlights', error);
          clearPendingHighlight();
        });
        return 'flow';
      }

      // Signed in, permission missing → just-in-time confirm dialog.
      setPermissionDialogOpen(true);
      return 'flow';
    },
    [
      flagOn,
      hasAuthProvider,
      isAuthenticated,
      hasHighlightsPermission,
      claimVerses,
      patchOverlay,
      enqueueWrite,
      runApply,
      versionId,
      book,
      chapter,
      startSignInForHighlights,
    ],
  );

  const remove = useCallback(
    (color: string, verses: number[]) => {
      // Removal only ever touches highlights already on screen, so it needs no
      // auth-flow branch: without a live authenticated session there is nothing
      // rendered to remove.
      if (!live || verses.length === 0) return;

      // Only clear verses currently rendered in this color — that's the popover's
      // per-color X semantics. (The DELETE endpoint clears any color in the
      // range, so the passage ids must not span other colors.)
      const normalizedColor = color.toLowerCase();
      const rendered = highlightedVersesRef.current;
      const targetVerses = verses.filter((verse) => rendered[verse] === normalizedColor);
      if (targetVerses.length === 0) return;

      const token = claimVerses(targetVerses);
      patchOverlay(targetVerses, null);
      void enqueueWrite(() => runRemove(normalizedColor, targetVerses, token));
    },
    [live, claimVerses, patchOverlay, enqueueWrite, runRemove],
  );

  // ---- Resume after an auth round-trip --------------------------------------
  // Runs on mount and whenever the session flips authenticated. Consumes a
  // data-exchange return once (reconciling the permission cache + cleaning the
  // URL), then resolves any pending highlight: apply it when the permission is
  // now granted, discard it on an explicit cancel/failure, or re-prompt when the
  // user came back signed in but still without the permission.
  const dataExchangeConsumedRef = useRef(false);
  const consumeDataExchangeReturnRef = useRef(consumeDataExchangeReturn);
  consumeDataExchangeReturnRef.current = consumeDataExchangeReturn;
  const hasHighlightsPermissionRef = useRef(hasHighlightsPermission);
  hasHighlightsPermissionRef.current = hasHighlightsPermission;

  useEffect(() => {
    if (!flagOn || !hasAuthProvider) return;

    if (!dataExchangeConsumedRef.current) {
      dataExchangeConsumedRef.current = true;
      const returned = consumeDataExchangeReturnRef.current();
      // Act on a decline/failure the moment the return is consumed — BEFORE the
      // auth gate below. The shipped YouVersionAuthProvider hydrates the session
      // asynchronously, so this effect's first run after a redirect return is
      // always unauthenticated; if the status only lived in a local across that
      // flip, the discard would be lost and the dialog the user just declined
      // would re-open. Discarding here runs exactly once and needs no session:
      // a decline means the intent is dead regardless of who ends up signed in.
      if (returned && returned.status !== 'granted') {
        clearPendingHighlight();
      }
    }

    const pending = readPendingHighlight();
    if (!pending) return;

    // Sign-in is still resolving the session — wait for the authenticated flip.
    if (!isAuthenticated) return;

    if (!hasHighlightsPermissionRef.current()) {
      // Signed in but the permission was not granted (e.g. one-fell-swoop
      // sign-in that returned without it) → offer the data-exchange grant.
      // A cancelled/failed data-exchange return never reaches here: its pending
      // highlight was discarded at consume time above.
      // NOTE: this replaces the state-machine's automatic sign-in→data-exchange
      // hop with a confirm prompt, to avoid an unattended redirect loop on load.
      setPermissionDialogOpen(true);
      return;
    }

    // Permission granted: apply the pending highlight. Write to its own scope so
    // a return that lands on a different chapter still persists it; paint the
    // optimistic overlay only when it matches what's on screen.
    clearPendingHighlight();
    const scope = scopeRef.current;
    const matchesCurrent =
      pending.versionId === scope.versionId &&
      pending.book === scope.book &&
      pending.chapter === scope.chapter;

    let token: object | null = null;
    if (matchesCurrent) {
      token = claimVerses(pending.verses);
      patchOverlay(pending.verses, pending.color);
    }

    void enqueueWrite(async () => {
      const results = await Promise.all(
        buildPassageIds(pending.book, pending.chapter, pending.verses).map((passageId) =>
          Result.tryPromise({
            try: () =>
              createHighlightRef.current({
                version_id: pending.versionId,
                passage_id: passageId,
                color: pending.color,
              }),
            catch: (cause) => new BibleReaderHighlightError('apply', passageId, cause),
          }),
        ),
      );
      const failures = results.filter(Result.isError).map((r) => r.error);
      if (failures.length === 0) {
        if (token) {
          for (const verse of pending.verses) {
            if (writeIntentRef.current.get(verse) === token) {
              pendingReconcileRef.current.set(verse, { op: 'apply', color: pending.color });
            }
          }
        }
        // Pull the server's copy of the just-granted highlight; the reconcile
        // effect retires the overlay once the GET reflects it.
        refetchRef.current();
        return;
      }
      // DEFERRED: this resume-path failure only logs + reverts. The pending
      // highlight was already cleared before enqueueing, so a 401 here loses
      // the intent instead of keep-pending + re-prompt like runApply does.
      // Rare window (grant just succeeded); follow-up: route resume-write
      // failures through runApply's failure handling.
      logWriteFailures(failures, pending.color);
      if (token) revertOwned(pending.verses, token);
    });
  }, [
    flagOn,
    hasAuthProvider,
    isAuthenticated,
    claimVerses,
    patchOverlay,
    enqueueWrite,
    revertOwned,
    logWriteFailures,
  ]);

  const onPermissionDialogOpenChange = useCallback((open: boolean) => {
    setPermissionDialogOpen(open);
    // Dismissing via outside-click / Escape is a decline: discard the pending
    // highlight but leave the verse selection untouched (the caller owns it).
    if (!open) clearPendingHighlight();
  }, []);

  const confirmPermissionDialog = useCallback(() => {
    setPermissionDialogOpen(false);
    // The pending highlight is already stashed; the data-exchange redirect will
    // round-trip and the resume effect applies it on return.
    void startDataExchangeForHighlights().catch((error) => {
      console.error('[YouVersion SDK] Failed to start data exchange for highlights', error);
      clearPendingHighlight();
    });
  }, [startDataExchangeForHighlights]);

  const cancelPermissionDialog = useCallback(() => {
    setPermissionDialogOpen(false);
    clearPendingHighlight();
  }, []);

  return {
    highlightedVerses,
    recentColors,
    apply,
    remove,
    permissionDialogOpen,
    onPermissionDialogOpenChange,
    confirmPermissionDialog,
    cancelPermissionDialog,
  };
}
