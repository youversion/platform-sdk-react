/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  persistSettledHighlightWrite,
  reconcileSettledHighlightOverlay,
  SETTLED_HIGHLIGHT_OVERLAY_TTL_MS,
  type SettledHighlightScope,
} from './settled-highlight-overlay';

const scope: SettledHighlightScope = { versionId: 111, book: 'JHN', chapter: '3' };

describe('settled-highlight-overlay', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips a successful apply for the same app, user, and scope', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'apply', color: 'FFEC5B', verses: [16, 17], scope },
      1_000,
    );

    expect(
      reconcileSettledHighlightOverlay('demos-key', 'user-1', scope, {}, 1_001),
    ).toEqual({ 16: 'ffec5b', 17: 'ffec5b' });
  });

  it('isolates overlays by app key and user', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'apply', color: 'ffec5b', verses: [16], scope },
      1_000,
    );

    expect(reconcileSettledHighlightOverlay('portal-key', 'user-1', scope, {}, 1_001)).toEqual({});
    expect(reconcileSettledHighlightOverlay('demos-key', 'user-2', scope, {}, 1_001)).toEqual({});
    expect(reconcileSettledHighlightOverlay('demos-key', 'user-1', scope, {}, 1_001)).toEqual({
      16: 'ffec5b',
    });
  });

  it('isolates overlays by Bible scope', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'apply', color: 'ffec5b', verses: [16], scope },
      1_000,
    );

    expect(
      reconcileSettledHighlightOverlay(
        'demos-key',
        'user-1',
        { ...scope, chapter: '4' },
        {},
        1_001,
      ),
    ).toEqual({});
  });

  it('retires an apply once server truth reflects it', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'apply', color: 'ffec5b', verses: [16], scope },
      1_000,
    );

    expect(
      reconcileSettledHighlightOverlay(
        'demos-key',
        'user-1',
        scope,
        { 16: 'ffec5b' },
        1_001,
      ),
    ).toEqual({});
    expect(reconcileSettledHighlightOverlay('demos-key', 'user-1', scope, {}, 1_002)).toEqual({});
  });

  it('holds a successful remove tombstone until TTL', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'remove', color: 'ffec5b', verses: [16], scope },
      1_000,
    );

    expect(
      reconcileSettledHighlightOverlay(
        'demos-key',
        'user-1',
        scope,
        { 16: 'ffec5b' },
        1_001,
      ),
    ).toEqual({ 16: null });
    expect(reconcileSettledHighlightOverlay('demos-key', 'user-1', scope, {}, 1_002)).toEqual({
      16: null,
    });
  });

  it('expires the overlay instead of becoming a durable highlight store', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'apply', color: 'ffec5b', verses: [16], scope },
      1_000,
    );

    expect(
      reconcileSettledHighlightOverlay(
        'demos-key',
        'user-1',
        scope,
        {},
        1_000 + SETTLED_HIGHLIGHT_OVERLAY_TTL_MS + 1,
      ),
    ).toEqual({});
  });

  it('uses the newest settled write for the same verse', () => {
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'apply', color: 'ffec5b', verses: [16], scope },
      1_000,
    );
    persistSettledHighlightWrite(
      'demos-key',
      'user-1',
      { kind: 'remove', color: 'ffec5b', verses: [16], scope },
      1_001,
    );

    expect(reconcileSettledHighlightOverlay('demos-key', 'user-1', scope, {}, 1_002)).toEqual({
      16: null,
    });
  });
});
