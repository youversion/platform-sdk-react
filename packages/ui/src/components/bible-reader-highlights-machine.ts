/**
 * BibleReader highlights flow as an xstate v5 statechart (YPE-1034, PR-288).
 *
 * This machine is the single source of truth for the highlight auth flow and the
 * optimistic write path. It replaces the hand-rolled effect/ref orchestration in
 * `useBibleReaderHighlights`, which is now a thin adapter (see that file). The
 * machine is authored with `setup()` and NAMED guards/actions/actors so it stays
 * statically analyzable / Stately-visualizable — no anonymous inline logic where
 * a named implementation is possible.
 *
 * Statechart shape (see docs/highlight-flow-statechart.md for the mermaid diagram):
 *
 *   booting ─(always)─▶ disabled | enabled
 *   disabled  ── flag off OR no auth provider: fully inert (no fetch, writes,
 *                dialogs). Color taps resolve to `noop`.
 *   enabled   ── parallel { flow, writer }
 *     flow region  (the auth/dialog flow)
 *       resuming ─ consume the data-exchange return once, then route on the
 *                  pending highlight + auth + permission.
 *       idle · signInDialog · permissionDialog · awaitingAuth
 *     writer region (serialized optimistic writes)
 *       idle ─(queue has work)─▶ writing ─(actor done)─▶ checkQueue ─▶ …
 *
 * External inputs (fetched highlights, auth flags, scope) are delivered as
 * events by the adapter; the machine never reaches into React.
 *
 * ── The "vapor" fix (PR-288) ──────────────────────────────────────────────
 * Reported on staging: a deleted highlight reappears for a split second, then
 * disappears. Root cause (confirmed): the reconcile step retired a REMOVE
 * overlay entry as soon as ANY fetch reflected the removal; a later response
 * from a stale read replica that still contained the highlight then had nothing
 * suppressing it, so the verse repainted until the next fetch cleared it.
 *
 * Fix (this machine): `reconcileOverlay` NEVER retires remove-overlay entries.
 * A removed verse's optimistic `null` overlay is held until a reset path
 * (scope change, sign-out, or a newer write re-claiming the verse). Apply
 * entries still retire on reflection, because the existing convergence tests
 * assert that after a fetch reflects an apply, later server-side changes to that
 * verse render (other-device convergence). Removes have no such convergence
 * test, and holding them is exactly the PR's already-accepted trade-off:
 * "a concurrent same-verse edit from another device renders stale until
 * navigation or the next write on this client." This is fix direction (a) from
 * the brief, applied only to the remove side (removes can never resurrect),
 * leaving the tested apply-convergence behavior untouched.
 */
import { collapseVerseRuns, formatPassageId, type VerseRun } from '@/lib/usfm-ranges';
import {
  appendPendingHighlight,
  clearPendingHighlight,
  peekPendingHighlights,
  readPendingHighlights,
  stashPendingHighlight,
  type PendingHighlight,
} from '@/lib/pending-highlight';
import { getHttpStatus } from '@youversion/platform-core';
import { Result } from 'better-result';
import { assign, enqueueActions, fromPromise, setup, type DoneActorEvent } from 'xstate';

// ── Domain types ────────────────────────────────────────────────────────────

export type HighlightScope = { versionId: number; book: string; chapter: string };

/**
 * The data-exchange return statuses. Mirrors core's `DataExchangeStatus` (UI
 * must not import core directly — see the package boundary rules).
 */
type DataExchangeStatus = 'granted' | 'cancel' | 'failure';

/** Verse number → hex color for the current scope, parsed from the fetch. */
export type ServerColors = Record<number, string>;

/** hex color means "optimistically applied", `null` means "optimistically removed". */
export type HighlightOverlay = Record<number, string | null>;

type ReconcileEntry = { op: 'apply' | 'remove'; color: string };

/** One serialized unit of work on the write queue. */
type WriteOp = {
  kind: 'apply' | 'remove';
  color: string;
  verses: number[];
  scope: HighlightScope;
  /** Per-verse ownership token; a failed write only reverts verses it still owns. */
  token: object;
  /** Whether the optimistic overlay was painted for this op (owns its verses). */
  paint: boolean;
};

type WriteResult = {
  op: WriteOp;
  failures: BibleReaderHighlightError[];
  failedVerses: number[];
  succeededVerses: number[];
};

/**
 * The live SDK service functions the actors/actions call. Passed in once via
 * `input` as a stable React ref so the machine spawn never changes yet always
 * sees the current closures.
 */
export type HighlightServices = {
  createHighlight: (data: {
    version_id: number;
    passage_id: string;
    color: string;
  }) => Promise<unknown>;
  deleteHighlight: (passageId: string, options: { version_id: number }) => Promise<void>;
  refetch: () => void;
  hasHighlightsPermission: () => boolean;
  invalidateHighlightsPermission: () => void;
  consumeDataExchangeReturn: () => { status: DataExchangeStatus } | null;
  startSignInForHighlights: () => Promise<void>;
  startDataExchangeForHighlights: () => Promise<void>;
};

export type HighlightServicesRef = { current: HighlightServices };

export type HighlightsMachineInput = {
  services: HighlightServicesRef;
  scope: HighlightScope;
  flagOn: boolean;
  hasAuthProvider: boolean;
  isAuthenticated: boolean;
};

export type TapOutcome = 'applied' | 'flow' | 'noop';

type HighlightsContext = {
  services: HighlightServicesRef;
  scope: HighlightScope;
  flagOn: boolean;
  hasAuthProvider: boolean;
  isAuthenticated: boolean;
  serverColors: ServerColors;
  overlay: HighlightOverlay;
  reconcile: Map<number, ReconcileEntry>;
  writeIntent: Map<number, object>;
  queue: WriteOp[];
  dataExchangeConsumed: boolean;
  /** Set by the TAP_COLOR handlers so the adapter can read the synchronous outcome. */
  lastTapOutcome: TapOutcome;
};

export type HighlightsEvent =
  | { type: 'TAP_COLOR'; color: string; verses: number[] }
  | { type: 'REMOVE'; color: string; verses: number[] }
  | {
      type: 'AUTH_CHANGED';
      flagOn: boolean;
      hasAuthProvider: boolean;
      isAuthenticated: boolean;
    }
  | { type: 'HIGHLIGHTS_UPDATED'; serverColors: ServerColors }
  | { type: 'SCOPE_CHANGED'; scope: HighlightScope }
  | { type: 'CONFIRM_SIGN_IN' }
  | { type: 'DECLINE_SIGN_IN' }
  | { type: 'CONFIRM_PERMISSION' }
  | { type: 'CANCEL_PERMISSION' }
  | { type: 'ENQUEUE'; op: WriteOp }
  | { type: 'PERMISSION_LOST' };

// ── Error boundary + helpers (module-level, reused by the write actor) ────────

/**
 * The error type the write boundary converts to. Core clients throw; we catch
 * here (via better-result) so a failed write can never take the reader down —
 * the failure is logged and the optimistic overlay reverted.
 */
export class BibleReaderHighlightError extends Error {
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

/** Expands a contiguous run back into its verse numbers: `{2,4} -> [2,3,4]`. */
function versesInRun(run: VerseRun): number[] {
  const verses: number[] = [];
  for (let verse = run.start; verse <= run.end; verse++) verses.push(verse);
  return verses;
}

/**
 * Pulls an HTTP status off a thrown ApiClient error (possibly wrapped in our own
 * `BibleReaderHighlightError`). Defers to core's `getHttpStatus` for the actual
 * status contract so the error shape stays owned by the client layer.
 */
function extractStatus(error: unknown): number | undefined {
  if (error instanceof BibleReaderHighlightError) return getHttpStatus(error.cause);
  return getHttpStatus(error);
}

/**
 * A 401/403 means the app lost (or never had) the highlights permission.
 *
 * DEFERRED (accepted for dark launch): a 401 from an *expired token* (not a
 * missing permission) also lands here and misroutes to the permission re-prompt
 * instead of a token refresh / re-auth. Follow-up: distinguish auth-expiry from
 * permission-denied at this boundary.
 */
function isPermissionError(error: unknown): boolean {
  const status = extractStatus(error);
  return status === 401 || status === 403;
}

function logWriteFailures(failures: BibleReaderHighlightError[], color: string): void {
  for (const failure of failures) {
    console.error(
      `[YouVersion SDK] Failed to ${failure.operation} highlight ` +
        `(passage ${failure.passageId}, color ${color})`,
      failure,
    );
  }
}

function opToPending(op: WriteOp): PendingHighlight {
  return {
    verses: op.verses,
    color: op.color,
    versionId: op.scope.versionId,
    book: op.scope.book,
    chapter: op.scope.chapter,
    timestamp: Date.now(),
  };
}

export function scopesEqual(a: HighlightScope, b: HighlightScope): boolean {
  return a.versionId === b.versionId && a.book === b.book && a.chapter === b.chapter;
}

/**
 * Claims a set of verses for a write: stamps each with the op's ownership
 * `token`, drops any pending reconciliation (a newer write supersedes it), and
 * paints the optimistic overlay (`color` for an apply, `null` for a remove).
 * Shared by every write entry point so the claim shape stays in one place.
 */
function claimVerses(
  context: Pick<HighlightsContext, 'writeIntent' | 'reconcile' | 'overlay'>,
  verses: number[],
  token: object,
  color: string | null,
): Pick<HighlightsContext, 'writeIntent' | 'reconcile' | 'overlay'> {
  const writeIntent = new Map(context.writeIntent);
  const reconcile = new Map(context.reconcile);
  const overlay = { ...context.overlay };
  for (const verse of verses) {
    writeIntent.set(verse, token);
    reconcile.delete(verse);
    overlay[verse] = color;
  }
  return { writeIntent, reconcile, overlay };
}

/** The rendered verse→color map: server truth with the optimistic overlay applied. */
export function selectHighlightedVerses(
  serverColors: ServerColors,
  overlay: HighlightOverlay,
): Record<number, string> {
  const map: Record<number, string> = { ...serverColors };
  for (const [verse, color] of Object.entries(overlay)) {
    if (color === null) delete map[Number(verse)];
    else map[Number(verse)] = color;
  }
  return map;
}

// ── The write actor ──────────────────────────────────────────────────────────

/**
 * Performs one queued write. Apply POSTs collapse contiguous runs to range
 * USFMs (one POST per run); remove DELETEs are PER VERSE (range DELETE is
 * unsupported server-side). Every sub-write is caught with better-result so the
 * actor always RESOLVES with a per-sub-write settlement — a batch can partially
 * succeed and the two halves need opposite treatment in `settleWrite`.
 */
const processWrite = fromPromise<WriteResult, { services: HighlightServicesRef; op: WriteOp }>(
  async ({ input }) => {
    const svc = input.services.current;
    const { op } = input;
    const failures: BibleReaderHighlightError[] = [];
    const failedVerses: number[] = [];
    const succeededVerses: number[] = [];

    if (op.kind === 'apply') {
      const runs = collapseVerseRuns(op.verses);
      const results = await Promise.all(
        runs.map((run) =>
          Result.tryPromise({
            try: () =>
              svc.createHighlight({
                version_id: op.scope.versionId,
                passage_id: formatPassageId(op.scope.book, op.scope.chapter, run),
                color: op.color,
              }),
            catch: (cause) =>
              new BibleReaderHighlightError(
                'apply',
                formatPassageId(op.scope.book, op.scope.chapter, run),
                cause,
              ),
          }),
        ),
      );
      runs.forEach((run, index) => {
        const result = results[index];
        if (result === undefined) return; // unreachable: 1:1 with runs
        const runVerses = versesInRun(run);
        if (Result.isError(result)) {
          failures.push(result.error);
          failedVerses.push(...runVerses);
        } else {
          succeededVerses.push(...runVerses);
        }
      });
    } else {
      const results = await Promise.all(
        op.verses.map((verse) => {
          const passageId = `${op.scope.book}.${op.scope.chapter}.${verse}`;
          return Result.tryPromise({
            try: () => svc.deleteHighlight(passageId, { version_id: op.scope.versionId }),
            catch: (cause) => new BibleReaderHighlightError('remove', passageId, cause),
          });
        }),
      );
      op.verses.forEach((verse, index) => {
        const result = results[index];
        if (result === undefined) return; // unreachable: 1:1 with verses
        if (Result.isError(result)) {
          failures.push(result.error);
          failedVerses.push(verse);
        } else {
          succeededVerses.push(verse);
        }
      });
    }

    return { op, failures, failedVerses, succeededVerses };
  },
);

// ── Machine ───────────────────────────────────────────────────────────────────

export const bibleReaderHighlightsMachine = setup({
  types: {
    context: {} as HighlightsContext,
    events: {} as HighlightsEvent,
    input: {} as HighlightsMachineInput,
  },
  actors: { processWrite },
  guards: {
    isEnabledNow: ({ context }) => context.flagOn && context.hasAuthProvider,
    isDisabledNow: ({ context }) => !context.flagOn || !context.hasAuthProvider,
    scopeIsDifferent: ({ context, event }) =>
      event.type === 'SCOPE_CHANGED' && !scopesEqual(context.scope, event.scope),
    queueHasWork: ({ context }) => context.queue.length > 0,
    signedOut: ({ context }) => !context.isAuthenticated,

    // ── TAP_COLOR fork ──
    tapInert: ({ event }) => event.type === 'TAP_COLOR' && event.verses.length === 0,
    tapCanWrite: ({ context, event }) =>
      event.type === 'TAP_COLOR' &&
      event.verses.length > 0 &&
      context.isAuthenticated &&
      context.services.current.hasHighlightsPermission(),
    tapNeedsSignIn: ({ context, event }) =>
      event.type === 'TAP_COLOR' && event.verses.length > 0 && !context.isAuthenticated,

    // ── resume fork ──
    // Guards must be pure, so they PEEK (never clear expired/malformed entries);
    // the clear-on-expiry/consume side effect stays in the actions/consume paths.
    noPending: () => peekPendingHighlights().length === 0,
    pendingNotAuthed: ({ context }) =>
      peekPendingHighlights().length > 0 && !context.isAuthenticated,
    pendingAuthedHasPermission: ({ context }) =>
      peekPendingHighlights().length > 0 &&
      context.isAuthenticated &&
      context.services.current.hasHighlightsPermission(),
    pendingAuthedNoPermission: ({ context }) =>
      peekPendingHighlights().length > 0 &&
      context.isAuthenticated &&
      !context.services.current.hasHighlightsPermission(),
  },
  actions: {
    setOutcomeNoop: assign({ lastTapOutcome: () => 'noop' as TapOutcome }),

    assignAuth: assign(({ event }) => {
      if (event.type !== 'AUTH_CHANGED') return {};
      return {
        flagOn: event.flagOn,
        hasAuthProvider: event.hasAuthProvider,
        isAuthenticated: event.isAuthenticated,
      };
    }),

    /** Sign-out / going disabled must not leave a stale overlay to resurface later. */
    resetWriteStateIfSignedOut: assign(({ event }) => {
      if (event.type !== 'AUTH_CHANGED' || event.isAuthenticated) return {};
      return {
        overlay: {},
        reconcile: new Map<number, ReconcileEntry>(),
        writeIntent: new Map<number, object>(),
        queue: [],
      };
    }),

    resetForScopeChange: assign(({ event }) => {
      if (event.type !== 'SCOPE_CHANGED') return {};
      // Verse numbers collide across scopes: drop the overlay + reconcile
      // expectations synchronously, and clear writeIntent so a stale-scope write
      // settling after this change can't pass its `writeIntent.get(verse) ===
      // token` ownership check and pollute the new scope's reconcile/overlay
      // under a colliding verse number. In-flight writes carry their own scope
      // and still refetch on settle; a resume-write re-paints via
      // `applyPendingHighlight` (which sets its own intent) so nothing relies on
      // the old intents surviving. This is also the escape hatch for a
      // never-converging write — navigating away releases it.
      return {
        scope: event.scope,
        overlay: {},
        reconcile: new Map<number, ReconcileEntry>(),
        writeIntent: new Map<number, object>(),
      };
    }),

    /**
     * Store the freshly fetched server truth and reconcile the overlay against
     * it. Apply entries retire once the fetch reflects the written color; remove
     * entries are HELD (the vapor fix — see the file header).
     */
    reconcileOverlay: assign(({ context, event }) => {
      if (event.type !== 'HIGHLIGHTS_UPDATED') return {};
      const serverColors = event.serverColors;
      if (context.reconcile.size === 0) return { serverColors };

      const overlay = { ...context.overlay };
      const reconcile = new Map(context.reconcile);
      let changed = false;
      for (const [verse, entry] of context.reconcile) {
        if (entry.op !== 'apply') continue; // remove entries never retire (vapor fix)
        if (serverColors[verse] === entry.color) {
          reconcile.delete(verse);
          if (verse in overlay) {
            delete overlay[verse];
            changed = true;
          }
        }
      }
      return changed ? { serverColors, overlay, reconcile } : { serverColors, reconcile };
    }),

    consumeDataExchangeOnce: assign(({ context }) => {
      if (context.dataExchangeConsumed) return {};
      const returned = context.services.current.consumeDataExchangeReturn();
      // Act on a decline/failure the moment the return is consumed — BEFORE the
      // auth gate. The shipped auth provider hydrates asynchronously, so this
      // runs unauthenticated on the first pass after a redirect return; a decline
      // means the intent is dead regardless of who ends up signed in.
      if (returned && returned.status !== 'granted') {
        clearPendingHighlight();
      }
      return { dataExchangeConsumed: true };
    }),

    /** Optimistically paint + claim + enqueue a user apply (TAP_COLOR authorized path). */
    startApplyWrite: enqueueActions(({ enqueue, context, event }) => {
      if (event.type !== 'TAP_COLOR') return;
      const color = event.color.toLowerCase();
      const verses = event.verses;
      const token = {};
      enqueue.assign(({ context: current }) => ({
        ...claimVerses(current, verses, token, color),
        lastTapOutcome: 'applied' as TapOutcome,
      }));
      const op: WriteOp = {
        kind: 'apply',
        color,
        verses,
        scope: context.scope,
        token,
        paint: true,
      };
      enqueue.raise({ type: 'ENQUEUE', op });
    }),

    /**
     * A tap that must enter the auth flow (signed out → sign-in dialog; signed in
     * without permission → permission dialog): stash the intent so it survives a
     * redirect round-trip / resumes after the grant, and report the `flow`
     * outcome so the caller keeps the verse selection.
     */
    stashPendingTap: enqueueActions(({ enqueue, context, event }) => {
      if (event.type !== 'TAP_COLOR') return;
      stashPendingHighlight({
        verses: event.verses,
        color: event.color.toLowerCase(),
        versionId: context.scope.versionId,
        book: context.scope.book,
        chapter: context.scope.chapter,
        timestamp: Date.now(),
      });
      enqueue.assign({ lastTapOutcome: () => 'flow' as TapOutcome });
    }),

    /** Remove: only clear verses currently rendered in the given color. */
    startRemoveWrite: enqueueActions(({ enqueue, context, event }) => {
      if (event.type !== 'REMOVE') return;
      if (!context.isAuthenticated) return; // nothing rendered to remove when signed out
      const color = event.color.toLowerCase();
      const rendered = selectHighlightedVerses(context.serverColors, context.overlay);
      const targetVerses = event.verses.filter((verse) => rendered[verse] === color);
      if (targetVerses.length === 0) return;

      const token = {};
      enqueue.assign(({ context: current }) => claimVerses(current, targetVerses, token, null));
      const op: WriteOp = {
        kind: 'remove',
        color,
        verses: targetVerses,
        scope: context.scope,
        token,
        paint: true,
      };
      enqueue.raise({ type: 'ENQUEUE', op });
    }),

    /**
     * Apply every pending highlight after a granted return. Each entry writes to
     * its OWN scope even if the user returned on a different chapter; an entry
     * only paints the overlay when its scope matches what is on screen. Entries
     * are enqueued first-to-last so verse-level ordering is deterministic; they
     * never overlap on verses (append's last-wins merge guarantees it).
     */
    applyPendingHighlight: enqueueActions(({ enqueue, context }) => {
      const pendings = readPendingHighlights();
      if (pendings.length === 0) return;
      clearPendingHighlight();
      for (const pending of pendings) {
        const scope: HighlightScope = {
          versionId: pending.versionId,
          book: pending.book,
          chapter: pending.chapter,
        };
        const paint = scopesEqual(scope, context.scope);
        const token = {};
        if (paint) {
          enqueue.assign(({ context: current }) =>
            claimVerses(current, pending.verses, token, pending.color),
          );
        }
        // Resume-applied writes route through the SAME failure handling as a
        // user-initiated apply: a 401/403 re-stashes the pending highlight (from
        // the op's own scope, so a cross-scope return still re-prompts on the
        // right passage) and re-opens the permission dialog, rather than silently
        // dropping the user's original color tap. Being an `apply` is what earns
        // that re-prompt at the consumer site (see `settleWrite`).
        const op: WriteOp = {
          kind: 'apply',
          color: pending.color,
          verses: pending.verses,
          scope,
          token,
          paint,
        };
        enqueue.raise({ type: 'ENQUEUE', op });
      }
    }),

    enqueueOp: assign(({ context, event }) => {
      if (event.type !== 'ENQUEUE') return {};
      return { queue: [...context.queue, event.op] };
    }),

    shiftQueue: assign(({ context }) => ({ queue: context.queue.slice(1) })),

    /**
     * Per-sub-write settlement of a finished batch: succeeded verses register for
     * reconciliation (overlay holds until a fetch reflects the write), failed
     * verses revert (only if still owned by this op's token), exactly one refetch
     * fires, and failures route by status (401/403 → invalidate + maybe re-prompt;
     * network/5xx → discard pending).
     */
    settleWrite: enqueueActions(({ enqueue, event }) => {
      // Wired only to the processWrite `onDone`; the done event is the actor's
      // `DoneActorEvent`, which is not part of the machine's public event union,
      // so bridge through `unknown` to read its `output`.
      const { op, failures, failedVerses, succeededVerses } = (
        event as unknown as DoneActorEvent<WriteResult>
      ).output;

      enqueue.assign(({ context: current }) => {
        const overlay = { ...current.overlay };
        const reconcile = new Map(current.reconcile);
        const writeIntent = new Map(current.writeIntent);
        for (const verse of succeededVerses) {
          if (current.writeIntent.get(verse) === op.token) {
            reconcile.set(verse, { op: op.kind, color: op.color });
            // Settled writes release their claim so intents can't accumulate
            // until sign-out. A newer op has already re-claimed the verse (its
            // token differs), so the guard leaves that fresher claim intact.
            writeIntent.delete(verse);
          }
        }
        for (const verse of failedVerses) {
          if (current.writeIntent.get(verse) === op.token) {
            if (verse in overlay) delete overlay[verse];
            writeIntent.delete(verse);
          }
        }
        return { overlay, reconcile, writeIntent };
      });

      // Exactly one GET per settled batch, success or failure — this is what
      // reconciles partial successes to server truth now that the hooks layer no
      // longer auto-refetches per write.
      enqueue(({ context: current }) => current.services.current.refetch());

      if (failures.length === 0) return;

      enqueue(() => logWriteFailures(failures, op.color));

      const permissionDenied = failures.some(isPermissionError);
      if (permissionDenied) {
        // Server says the permission is gone (or never applied): invalidate the
        // optimistic cache. Server truth wins.
        enqueue(({ context: current }) =>
          current.services.current.invalidateHighlightsPermission(),
        );
        // Only an apply keeps the pending highlight + re-prompts: a user apply
        // and a resume-applied pending both re-stash + re-open the permission
        // dialog so the original tap is never silently lost. Removes deliberately
        // don't re-prompt (fixing the old deferred wart): with no pending
        // highlight, a re-prompt's post-grant resume was a no-op — invalidate the
        // cache only, and the next apply re-enters the flow.
        if (op.kind === 'apply') {
          // Keep this highlight pending and re-prompt the just-in-time dialog.
          // Append (not replace): a sibling batch that already lost permission may
          // hold a different color/verses, and both intents must survive the grant.
          enqueue(() => appendPendingHighlight(opToPending(op)));
          enqueue.raise({ type: 'PERMISSION_LOST' });
        }
      } else if (op.kind === 'apply') {
        // Network / 5xx: overlay already reverted; drop pending. INTENTIONAL for
        // resumed writes too — transient failures consume the intent uniformly
        // (the user is authed now; a re-tap just works, and the failure surfaces
        // via the snackbar, YPE-3873). Re-stashing instead would auto-apply the
        // highlight on a later mount within the pending TTL with no user action,
        // which is worse than asking for one more tap.
        enqueue(() => clearPendingHighlight());
      }
    }),

    // ── Dialog side effects (fire-and-forget redirects, matching the hook) ──
    startSignIn: ({ context }) => {
      void context.services.current.startSignInForHighlights().catch((error: unknown) => {
        console.error('[YouVersion SDK] Failed to start sign-in for highlights', error);
        clearPendingHighlight();
      });
    },
    startDataExchange: ({ context }) => {
      void context.services.current.startDataExchangeForHighlights().catch((error: unknown) => {
        console.error('[YouVersion SDK] Failed to start data exchange for highlights', error);
        clearPendingHighlight();
      });
    },
    clearPending: () => clearPendingHighlight(),
  },
}).createMachine({
  id: 'bibleReaderHighlights',
  context: ({ input }) => ({
    services: input.services,
    scope: input.scope,
    flagOn: input.flagOn,
    hasAuthProvider: input.hasAuthProvider,
    isAuthenticated: input.isAuthenticated,
    serverColors: {},
    overlay: {},
    reconcile: new Map(),
    writeIntent: new Map(),
    queue: [],
    dataExchangeConsumed: false,
    lastTapOutcome: 'noop',
  }),
  // These three inputs update context regardless of the active state; state
  // moves are driven by `always` guards that read the freshly-assigned context.
  on: {
    AUTH_CHANGED: { actions: ['assignAuth', 'resetWriteStateIfSignedOut'] },
    HIGHLIGHTS_UPDATED: { actions: 'reconcileOverlay' },
    SCOPE_CHANGED: { guard: 'scopeIsDifferent', actions: 'resetForScopeChange' },
  },
  initial: 'booting',
  states: {
    booting: {
      always: [{ guard: 'isEnabledNow', target: 'enabled' }, { target: 'disabled' }],
    },

    disabled: {
      // Flag off or no auth provider: fully inert. Taps resolve to noop; removes
      // are ignored. Copy/share (owned by the caller) are unaffected.
      always: [{ guard: 'isEnabledNow', target: 'enabled' }],
      on: {
        TAP_COLOR: { actions: 'setOutcomeNoop' },
        REMOVE: {},
      },
    },

    enabled: {
      always: [{ guard: 'isDisabledNow', target: 'disabled' }],
      type: 'parallel',
      states: {
        flow: {
          initial: 'resuming',
          on: {
            // A write's 401/403 (raised by settleWrite) re-opens the JIT dialog.
            PERMISSION_LOST: { target: '.permissionDialog' },
            // Taps are handled here so any flow substate resolves them.
            TAP_COLOR: [
              { guard: 'tapInert', actions: 'setOutcomeNoop' },
              { guard: 'tapCanWrite', target: '.idle', actions: 'startApplyWrite' },
              { guard: 'tapNeedsSignIn', target: '.signInDialog', actions: 'stashPendingTap' },
              { target: '.permissionDialog', actions: 'stashPendingTap' },
            ],
            REMOVE: { actions: 'startRemoveWrite' },
          },
          states: {
            resuming: {
              entry: 'consumeDataExchangeOnce',
              always: [
                { guard: 'noPending', target: 'idle' },
                { guard: 'pendingNotAuthed', target: 'awaitingAuth' },
                {
                  guard: 'pendingAuthedHasPermission',
                  target: 'idle',
                  actions: 'applyPendingHighlight',
                },
                { target: 'permissionDialog' },
              ],
            },
            awaitingAuth: {
              // Wait for the authenticated flip, then resolve the pending intent.
              // No self-target: when still unauthenticated, none match and we stay.
              always: [
                { guard: 'noPending', target: 'idle' },
                {
                  guard: 'pendingAuthedHasPermission',
                  target: 'idle',
                  actions: 'applyPendingHighlight',
                },
                { guard: 'pendingAuthedNoPermission', target: 'permissionDialog' },
              ],
            },
            idle: {},
            signInDialog: {
              on: {
                CONFIRM_SIGN_IN: { target: 'idle', actions: 'startSignIn' },
                DECLINE_SIGN_IN: { target: 'idle', actions: 'clearPending' },
              },
            },
            permissionDialog: {
              // The host can sign the user out while this dialog is open. A
              // confirm would then start a data exchange that rejects
              // unauthenticated, so route back to idle and drop the pending
              // intent as soon as the sign-out lands (assignAuth on the root
              // AUTH_CHANGED updates isAuthenticated, then this always fires).
              // permissionDialog is only ever entered while authenticated, so
              // this guard never misfires on entry.
              always: [{ guard: 'signedOut', target: 'idle', actions: 'clearPending' }],
              on: {
                CONFIRM_PERMISSION: { target: 'idle', actions: 'startDataExchange' },
                CANCEL_PERMISSION: { target: 'idle', actions: 'clearPending' },
              },
            },
          },
        },

        writer: {
          initial: 'idle',
          on: {
            // FIFO enqueue works in any writer state; `idle.always` starts it.
            ENQUEUE: { actions: 'enqueueOp' },
          },
          states: {
            idle: {
              always: [{ guard: 'queueHasWork', target: 'writing' }],
            },
            writing: {
              invoke: {
                src: 'processWrite',
                input: ({ context }) => ({ services: context.services, op: context.queue[0]! }),
                onDone: { target: 'checkQueue', actions: ['settleWrite', 'shiftQueue'] },
                // processWrite catches internally and never rejects, but keep the
                // queue alive if it ever does.
                onError: { target: 'checkQueue', actions: 'shiftQueue' },
              },
            },
            checkQueue: {
              always: [{ guard: 'queueHasWork', target: 'writing' }, { target: 'idle' }],
            },
          },
        },
      },
    },
  },
});
