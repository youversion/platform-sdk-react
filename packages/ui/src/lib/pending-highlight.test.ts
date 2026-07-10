/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearPendingHighlight,
  PENDING_HIGHLIGHT_TTL_MS,
  readPendingHighlight,
  stashPendingHighlight,
  type PendingHighlight,
} from './pending-highlight';

const base: PendingHighlight = {
  verses: [16, 17],
  color: 'fffe00',
  versionId: 111,
  book: 'JHN',
  chapter: '3',
  timestamp: 1_000_000,
};

describe('pending-highlight', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('round-trips a stashed pending highlight', () => {
    stashPendingHighlight(base);
    expect(readPendingHighlight(base.timestamp)).toEqual(base);
  });

  it('returns null when nothing is stashed', () => {
    expect(readPendingHighlight()).toBeNull();
  });

  it('discards and clears an expired entry on read', () => {
    stashPendingHighlight(base);
    const expiredNow = base.timestamp + PENDING_HIGHLIGHT_TTL_MS + 1;
    expect(readPendingHighlight(expiredNow)).toBeNull();
    // Cleared as a side effect: even reading at a fresh time finds nothing.
    expect(readPendingHighlight(base.timestamp)).toBeNull();
  });

  it('keeps an entry that is exactly at the TTL boundary', () => {
    stashPendingHighlight(base);
    expect(readPendingHighlight(base.timestamp + PENDING_HIGHLIGHT_TTL_MS)).toEqual(base);
  });

  it('discards malformed JSON', () => {
    sessionStorage.setItem('youversion-platform:pending-highlight', '{broken');
    expect(readPendingHighlight()).toBeNull();
  });

  it('discards a structurally-invalid entry', () => {
    sessionStorage.setItem(
      'youversion-platform:pending-highlight',
      JSON.stringify({ verses: 'nope', color: 1 }),
    );
    expect(readPendingHighlight()).toBeNull();
  });

  it('clearPendingHighlight removes the entry', () => {
    stashPendingHighlight(base);
    clearPendingHighlight();
    expect(readPendingHighlight(base.timestamp)).toBeNull();
  });
});
