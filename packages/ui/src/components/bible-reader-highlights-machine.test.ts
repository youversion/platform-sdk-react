/**
 * @vitest-environment jsdom
 *
 * Direct unit coverage for `bibleReaderHighlightsMachine`'s writeIntent
 * lifecycle (the per-verse ownership tokens that gate reconcile/overlay
 * settlement): settled writes release their claim, a scope change clears stale
 * claims so an old-scope write can't pollute the new scope, and a newer write's
 * claim survives an older write's settle on the same verse. Drives the machine
 * with `createActor` and controlled service promises — no React.
 */
import { createActor } from 'xstate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendPendingHighlight,
  peekPendingHighlights,
  readPendingHighlights,
} from '@/lib/pending-highlight';
import {
  bibleReaderHighlightsMachine,
  type HighlightScope,
  type HighlightServices,
  type HighlightServicesRef,
} from './bible-reader-highlights-machine';

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

type Deferred = { promise: Promise<unknown>; resolve: (value?: unknown) => void };
function deferred(): Deferred {
  let resolve!: (value?: unknown) => void;
  const promise = new Promise<unknown>((res) => {
    resolve = res as (value?: unknown) => void;
  });
  return { promise, resolve };
}

function makeServices(overrides: Partial<HighlightServices> = {}): {
  ref: HighlightServicesRef;
  refetch: ReturnType<typeof vi.fn>;
} {
  const refetch = vi.fn();
  const services: HighlightServices = {
    createHighlight: vi.fn().mockResolvedValue(undefined),
    deleteHighlight: vi.fn().mockResolvedValue(undefined),
    refetch,
    hasHighlightsPermission: () => true,
    invalidateHighlightsPermission: vi.fn(),
    consumeDataExchangeReturn: () => null,
    startSignInForHighlights: vi.fn().mockResolvedValue(undefined),
    startDataExchangeForHighlights: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { ref: { current: services }, refetch };
}

const scopeJHN3: HighlightScope = { versionId: 111, book: 'JHN', chapter: '3' };
const scopeJHN4: HighlightScope = { versionId: 111, book: 'JHN', chapter: '4' };

function startMachine(ref: HighlightServicesRef, scope: HighlightScope = scopeJHN3) {
  const actor = createActor(bibleReaderHighlightsMachine, {
    input: { services: ref, scope, flagOn: true, hasAuthProvider: true, isAuthenticated: true },
  });
  actor.start();
  return actor;
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('bibleReaderHighlightsMachine — writeIntent lifecycle', () => {
  it('releases a verse writeIntent entry once its write settles', async () => {
    const { ref, refetch } = makeServices();
    const actor = startMachine(ref);

    actor.send({ type: 'TAP_COLOR', color: 'FFFE00', verses: [16] });
    // Claimed synchronously before the write settles.
    expect(actor.getSnapshot().context.writeIntent.get(16)).toBeDefined();

    await vi.waitFor(() => expect(refetch).toHaveBeenCalled());

    const ctx = actor.getSnapshot().context;
    expect(ctx.writeIntent.has(16)).toBe(false);
    expect(ctx.reconcile.get(16)).toEqual({ op: 'apply', color: 'fffe00' });
    actor.stop();
  });

  it('does not let an old-scope write pollute the new scope after SCOPE_CHANGED', async () => {
    const pending = deferred();
    const createHighlight = vi.fn().mockReturnValue(pending.promise);
    const { ref, refetch } = makeServices({ createHighlight });
    const actor = startMachine(ref);

    actor.send({ type: 'TAP_COLOR', color: 'FFFE00', verses: [16] });
    await vi.waitFor(() => expect(createHighlight).toHaveBeenCalled());
    expect(actor.getSnapshot().context.overlay).toEqual({ 16: 'fffe00' });

    // Navigate to a new chapter while the old-scope write is still in flight.
    actor.send({ type: 'SCOPE_CHANGED', scope: scopeJHN4 });
    expect(actor.getSnapshot().context.overlay).toEqual({});
    expect(actor.getSnapshot().context.writeIntent.size).toBe(0);

    // The old-scope (JHN.3) write settles after the scope change.
    pending.resolve(undefined);
    await vi.waitFor(() => expect(refetch).toHaveBeenCalled());

    // Verse 16 in the NEW scope must be untouched by the JHN.3 write.
    const ctx = actor.getSnapshot().context;
    expect(ctx.reconcile.size).toBe(0);
    expect(ctx.overlay).toEqual({});
    expect(ctx.writeIntent.size).toBe(0);
    actor.stop();
  });

  it("preserves a newer write's claim when an older write settles on the same verse", async () => {
    const first = deferred();
    const second = deferred();
    const queued = [first, second];
    let callIndex = 0;
    const createHighlight = vi.fn().mockImplementation(() => queued[callIndex++]!.promise);
    const { ref, refetch } = makeServices({ createHighlight });
    const actor = startMachine(ref);

    // Write A: apply pink to verse 16 (goes in flight).
    actor.send({ type: 'TAP_COLOR', color: 'ff95ef', verses: [16] });
    await vi.waitFor(() => expect(createHighlight).toHaveBeenCalledTimes(1));
    const claimA = actor.getSnapshot().context.writeIntent.get(16);
    expect(claimA).toBeDefined();

    // Write B: re-claim verse 16 with green while A is still in flight (queued).
    actor.send({ type: 'TAP_COLOR', color: '5dff79', verses: [16] });
    const claimB = actor.getSnapshot().context.writeIntent.get(16);
    expect(claimB).toBeDefined();
    expect(claimB).not.toBe(claimA);
    expect(actor.getSnapshot().context.overlay).toEqual({ 16: '5dff79' });

    // A settles: it must not delete B's claim or reconcile verse 16.
    first.resolve(undefined);
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    const afterA = actor.getSnapshot().context;
    expect(afterA.writeIntent.get(16)).toBe(claimB);
    expect(afterA.reconcile.has(16)).toBe(false);
    expect(afterA.overlay).toEqual({ 16: '5dff79' });

    // B settles: it cleans up its own claim and registers its reconcile entry.
    await vi.waitFor(() => expect(createHighlight).toHaveBeenCalledTimes(2));
    second.resolve(undefined);
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
    const afterB = actor.getSnapshot().context;
    expect(afterB.writeIntent.has(16)).toBe(false);
    expect(afterB.reconcile.get(16)).toEqual({ op: 'apply', color: '5dff79' });
    actor.stop();
  });
});

describe('bibleReaderHighlightsMachine — pending stash on lost permission', () => {
  it('preserves BOTH intents when two queued apply writes each lose permission', async () => {
    // The exact review scenario: tap color A on verses 1-3, then color B on 4-6
    // before the first write settles; both 401. A single-slot stash would let the
    // second settle overwrite the first, losing color A after the re-grant.
    const createHighlight = vi.fn().mockRejectedValue(httpError(401));
    const { ref, refetch } = makeServices({ createHighlight });
    const actor = startMachine(ref);
    vi.spyOn(console, 'error').mockImplementation(vi.fn());

    // Both taps issued before either write settles: A is writing, B is queued.
    actor.send({ type: 'TAP_COLOR', color: 'fffe00', verses: [1, 2, 3] });
    actor.send({ type: 'TAP_COLOR', color: '5dff79', verses: [4, 5, 6] });

    await vi.waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));

    const stash = peekPendingHighlights();
    expect(stash).toHaveLength(2);
    // Verse-level ordering deterministic: first-queued (A) first.
    expect(stash[0]).toMatchObject({ verses: [1, 2, 3], color: 'fffe00' });
    expect(stash[1]).toMatchObject({ verses: [4, 5, 6], color: '5dff79' });
    actor.stop();
  });

  it('keeps a sibling’s stashed intent when a later write fails with a network/5xx error', async () => {
    // Write 1 (color A) 401s and stashes; write 2 (color B) then fails 5xx. The
    // 5xx path must NOT clear the stash — write 2 never stashed anything of its
    // own, and write 1's intent must survive to resume after the re-grant.
    const createHighlight = vi
      .fn()
      .mockRejectedValueOnce(httpError(401))
      .mockRejectedValueOnce(httpError(500));
    const { ref, refetch } = makeServices({ createHighlight });
    const actor = startMachine(ref);
    vi.spyOn(console, 'error').mockImplementation(vi.fn());

    actor.send({ type: 'TAP_COLOR', color: 'fffe00', verses: [1, 2, 3] });
    actor.send({ type: 'TAP_COLOR', color: '5dff79', verses: [4, 5, 6] });

    await vi.waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));

    const stash = peekPendingHighlights();
    expect(stash).toHaveLength(1);
    expect(stash[0]).toMatchObject({ verses: [1, 2, 3], color: 'fffe00' });
    // The 5xx write's verses were never stashed.
    expect(stash.some((entry) => entry.verses.includes(4))).toBe(false);
    actor.stop();
  });

  it('re-applies every stashed entry after a restart with permission granted', async () => {
    // Two entries survived a data-exchange redirect; on the granted return the
    // machine restarts and must resume ALL of them, not just the last.
    const now = Date.now();
    appendPendingHighlight(
      {
        verses: [1, 2, 3],
        color: 'fffe00',
        versionId: 111,
        book: 'JHN',
        chapter: '3',
        timestamp: now,
      },
      now,
    );
    appendPendingHighlight(
      {
        verses: [4, 5, 6],
        color: '5dff79',
        versionId: 111,
        book: 'JHN',
        chapter: '3',
        timestamp: now,
      },
      now,
    );
    const createHighlight = vi.fn().mockResolvedValue(undefined);
    const { ref } = makeServices({ createHighlight });
    const actor = startMachine(ref);

    await vi.waitFor(() => expect(createHighlight).toHaveBeenCalledTimes(2));

    const passages = createHighlight.mock.calls.map(
      (call) => (call[0] as { passage_id: string }).passage_id,
    );
    expect(passages).toEqual(['JHN.3.1-3', 'JHN.3.4-6']);
    // Both colors painted in the same-scope overlay.
    expect(actor.getSnapshot().context.overlay).toEqual({
      1: 'fffe00',
      2: 'fffe00',
      3: 'fffe00',
      4: '5dff79',
      5: '5dff79',
      6: '5dff79',
    });
    // Pending consumed once resumed.
    expect(readPendingHighlights()).toEqual([]);
    actor.stop();
  });
});
