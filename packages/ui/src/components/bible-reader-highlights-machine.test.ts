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
  bibleReaderHighlightsMachine,
  type HighlightScope,
  type HighlightServices,
  type HighlightServicesRef,
} from './bible-reader-highlights-machine';

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

async function waitFor(
  actor: ReturnType<typeof startMachine>,
  predicate: (snapshot: ReturnType<typeof actor.getSnapshot>) => boolean,
  timeoutMs = 1000,
): Promise<void> {
  const start = Date.now();
  while (!predicate(actor.getSnapshot())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
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

    await waitFor(actor, () => refetch.mock.calls.length > 0);

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
    await waitFor(actor, () => createHighlight.mock.calls.length > 0);
    expect(actor.getSnapshot().context.overlay).toEqual({ 16: 'fffe00' });

    // Navigate to a new chapter while the old-scope write is still in flight.
    actor.send({ type: 'SCOPE_CHANGED', scope: scopeJHN4 });
    expect(actor.getSnapshot().context.overlay).toEqual({});
    expect(actor.getSnapshot().context.writeIntent.size).toBe(0);

    // The old-scope (JHN.3) write settles after the scope change.
    pending.resolve(undefined);
    await waitFor(actor, () => refetch.mock.calls.length > 0);

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

    // Write A: apply red to verse 16 (goes in flight).
    actor.send({ type: 'TAP_COLOR', color: 'FF0000', verses: [16] });
    await waitFor(actor, () => createHighlight.mock.calls.length === 1);
    const claimA = actor.getSnapshot().context.writeIntent.get(16);
    expect(claimA).toBeDefined();

    // Write B: re-claim verse 16 with green while A is still in flight (queued).
    actor.send({ type: 'TAP_COLOR', color: '00FF00', verses: [16] });
    const claimB = actor.getSnapshot().context.writeIntent.get(16);
    expect(claimB).toBeDefined();
    expect(claimB).not.toBe(claimA);
    expect(actor.getSnapshot().context.overlay).toEqual({ 16: '00ff00' });

    // A settles: it must not delete B's claim or reconcile verse 16.
    first.resolve(undefined);
    await waitFor(actor, () => refetch.mock.calls.length === 1);
    const afterA = actor.getSnapshot().context;
    expect(afterA.writeIntent.get(16)).toBe(claimB);
    expect(afterA.reconcile.has(16)).toBe(false);
    expect(afterA.overlay).toEqual({ 16: '00ff00' });

    // B settles: it cleans up its own claim and registers its reconcile entry.
    await waitFor(actor, () => createHighlight.mock.calls.length === 2);
    second.resolve(undefined);
    await waitFor(actor, () => refetch.mock.calls.length === 2);
    const afterB = actor.getSnapshot().context;
    expect(afterB.writeIntent.has(16)).toBe(false);
    expect(afterB.reconcile.get(16)).toEqual({ op: 'apply', color: '00ff00' });
    actor.stop();
  });
});
