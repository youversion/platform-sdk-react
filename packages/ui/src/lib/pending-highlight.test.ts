/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendPendingHighlight,
  clearPendingHighlight,
  peekPendingHighlights,
  PENDING_HIGHLIGHT_TTL_MS,
  readPendingHighlights,
  stashPendingHighlight,
  type PendingHighlight,
} from './pending-highlight';

const STORAGE_KEY = 'youversion-platform:pending-highlight';

const base: PendingHighlight = {
  verses: [16, 17],
  color: 'ffec5b',
  versionId: 111,
  book: 'JHN',
  chapter: '3',
  timestamp: 1_000_000,
};

function entry(overrides: Partial<PendingHighlight> = {}): PendingHighlight {
  return { ...base, ...overrides };
}

describe('pending-highlight', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('round-trips a stashed pending highlight as a single-entry list', () => {
    stashPendingHighlight(base);
    expect(readPendingHighlights(base.timestamp)).toEqual([base]);
  });

  it('returns an empty list when nothing is stashed', () => {
    expect(readPendingHighlights()).toEqual([]);
  });

  it('stash replaces the whole list', () => {
    const a = entry({ verses: [1, 2], color: 'aaaaaa' });
    const b = entry({ verses: [3, 4], color: 'bbbbbb' });
    stashPendingHighlight(a);
    // A fresh tap supersedes everything prior.
    stashPendingHighlight(b);
    expect(readPendingHighlights(base.timestamp)).toEqual([b]);
  });

  it('keeps an entry that is exactly at the TTL boundary', () => {
    stashPendingHighlight(base);
    expect(readPendingHighlights(base.timestamp + PENDING_HIGHLIGHT_TTL_MS)).toEqual([base]);
  });

  it('discards malformed JSON', () => {
    sessionStorage.setItem(STORAGE_KEY, '{broken');
    expect(readPendingHighlights()).toEqual([]);
  });

  it('discards a non-array value', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(base));
    expect(readPendingHighlights()).toEqual([]);
  });

  it('discards an array with a structurally-invalid entry', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([base, { verses: 'nope', color: 1 }]));
    expect(readPendingHighlights()).toEqual([]);
  });

  it('degrades [null] without throwing', () => {
    sessionStorage.setItem(STORAGE_KEY, '[null]');
    expect(readPendingHighlights()).toEqual([]);
    expect(peekPendingHighlights()).toEqual([]);
  });

  it('skips null elements but keeps valid entries', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([null, base]));
    expect(readPendingHighlights(base.timestamp)).toEqual([base]);
  });

  it('clearPendingHighlight removes every entry', () => {
    appendPendingHighlight(entry({ verses: [1] }), base.timestamp);
    appendPendingHighlight(entry({ verses: [2] }), base.timestamp);
    clearPendingHighlight();
    expect(readPendingHighlights(base.timestamp)).toEqual([]);
  });

  describe('append merge (verse-level last-wins)', () => {
    it('appends a disjoint entry and preserves the earlier one', () => {
      const a = entry({ verses: [1, 2, 3], color: 'aaaaaa' });
      const b = entry({ verses: [4, 5, 6], color: 'bbbbbb' });
      appendPendingHighlight(a, base.timestamp);
      appendPendingHighlight(b, base.timestamp);
      // Two colors preserved — the single-slot bug this fixes would drop `a`.
      expect(readPendingHighlights(base.timestamp)).toEqual([a, b]);
    });

    it('strips the new entry’s verses from earlier entries (last-wins)', () => {
      const a = entry({ verses: [1, 2, 3], color: 'aaaaaa' });
      const b = entry({ verses: [2], color: 'bbbbbb' });
      appendPendingHighlight(a, base.timestamp);
      appendPendingHighlight(b, base.timestamp);
      expect(readPendingHighlights(base.timestamp)).toEqual([
        entry({ verses: [1, 3], color: 'aaaaaa' }),
        b,
      ]);
    });

    it('drops an earlier entry that is fully overwritten', () => {
      const a = entry({ verses: [1, 2], color: 'aaaaaa' });
      const b = entry({ verses: [1, 2], color: 'bbbbbb' });
      appendPendingHighlight(a, base.timestamp);
      appendPendingHighlight(b, base.timestamp);
      expect(readPendingHighlights(base.timestamp)).toEqual([b]);
    });

    it('appends onto an empty stash', () => {
      appendPendingHighlight(base, base.timestamp);
      expect(readPendingHighlights(base.timestamp)).toEqual([base]);
    });
  });

  describe('per-entry expiry', () => {
    it('filters out an expired entry but keeps the live one', () => {
      const fresh = entry({ verses: [1], color: 'aaaaaa', timestamp: base.timestamp });
      // Stale entry lands directly in storage alongside a fresh one.
      const stale = entry({
        verses: [2],
        color: 'bbbbbb',
        timestamp: base.timestamp - PENDING_HIGHLIGHT_TTL_MS - 1,
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([stale, fresh]));
      expect(peekPendingHighlights(base.timestamp)).toEqual([fresh]);
    });

    it('read rewrites storage when a partially-expired list is found', () => {
      const fresh = entry({ verses: [1], color: 'aaaaaa', timestamp: base.timestamp });
      const stale = entry({
        verses: [2],
        color: 'bbbbbb',
        timestamp: base.timestamp - PENDING_HIGHLIGHT_TTL_MS - 1,
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([stale, fresh]));
      expect(readPendingHighlights(base.timestamp)).toEqual([fresh]);
      // The stale entry is gone from storage, not just from the returned list.
      expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual([fresh]);
    });

    it('read clears storage when every entry has expired', () => {
      stashPendingHighlight(base);
      const expiredNow = base.timestamp + PENDING_HIGHLIGHT_TTL_MS + 1;
      expect(readPendingHighlights(expiredNow)).toEqual([]);
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('append drops expired entries as it merges', () => {
      const stale = entry({
        verses: [1],
        color: 'aaaaaa',
        timestamp: base.timestamp - PENDING_HIGHLIGHT_TTL_MS - 1,
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([stale]));
      const fresh = entry({ verses: [2], color: 'bbbbbb', timestamp: base.timestamp });
      appendPendingHighlight(fresh, base.timestamp);
      expect(readPendingHighlights(base.timestamp)).toEqual([fresh]);
    });
  });

  describe('peekPendingHighlights', () => {
    it('round-trips a live list without mutating storage', () => {
      stashPendingHighlight(base);
      expect(peekPendingHighlights(base.timestamp)).toEqual([base]);
      // Still present: peek never clears.
      expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });

    it('returns [] for an expired entry AND leaves storage untouched', () => {
      stashPendingHighlight(base);
      const expiredNow = base.timestamp + PENDING_HIGHLIGHT_TTL_MS + 1;
      expect(peekPendingHighlights(expiredNow)).toEqual([]);
      // Untouched: the raw entry is still there (unlike readPendingHighlights).
      expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });

    it('returns [] for a malformed entry AND leaves storage untouched', () => {
      sessionStorage.setItem(STORAGE_KEY, '{broken');
      expect(peekPendingHighlights()).toEqual([]);
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe('{broken');
    });
  });
});
