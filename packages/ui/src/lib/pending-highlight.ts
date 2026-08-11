/**
 * A user's stashed highlight intents while the highlight auth flow is in flight
 * (YPE-1034). Persisted to `sessionStorage` so they survive the full-page OAuth /
 * data-exchange redirect round-trip, and expire (~10 min) so an abandoned
 * round-trip can never silently apply a highlight during a much later sign-in.
 *
 * The stash is a LIST of entries, not a single slot: queued optimistic writes can
 * each lose permission and each carry a different color, which no single-slot
 * merge could represent. A fresh user tap replaces the whole list ({@link
 * stashPendingHighlight}); a write that loses permission appends
 * ({@link appendPendingHighlight}) with verse-level last-wins so entries never
 * overlap on verses.
 *
 * This is NOT highlight data (highlights are server-only account data, ADR-001);
 * it is a short-lived intent record, discarded on decline, cancel, failure, or
 * successful apply.
 */
import { getSessionStorage } from '@youversion/platform-core';

export type PendingHighlight = {
  /** Verse numbers to highlight. */
  verses: number[];
  /** Highlight color, 6-char lowercase hex without `#`. */
  color: string;
  /** Bible version id (a.k.a. `bible_id` at the API boundary). */
  versionId: number;
  /** USFM book id (e.g. `JHN`). */
  book: string;
  /** Chapter id (e.g. `3`). */
  chapter: string;
  /** Epoch ms when stashed; drives per-entry expiry. */
  timestamp: number;
};

const STORAGE_KEY = 'youversion-platform:pending-highlight';

/** Pending entries older than this on read are treated as expired. */
export const PENDING_HIGHLIGHT_TTL_MS = 10 * 60 * 1000;

function isPendingHighlight(value: unknown): value is PendingHighlight {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.verses) &&
    candidate.verses.every((v) => typeof v === 'number') &&
    typeof candidate.color === 'string' &&
    typeof candidate.versionId === 'number' &&
    typeof candidate.book === 'string' &&
    typeof candidate.chapter === 'string' &&
    typeof candidate.timestamp === 'number'
  );
}

function isPendingHighlightArray(value: unknown): value is PendingHighlight[] {
  return Array.isArray(value) && value.every(isPendingHighlight);
}

function writeEntries(entries: PendingHighlight[]): void {
  const store = getSessionStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota / disabled storage — nothing to do; the flow simply won't resume.
  }
}

/**
 * Reads the stored entries, keeping only the live (unexpired) ones. `stale` is
 * `true` when the raw value was malformed or any entry was dropped as expired, so
 * a caller that mutates storage knows the persisted value needs rewriting or
 * clearing. Never touches storage; callers decide.
 */
function readStoredPending(now: number): { entries: PendingHighlight[]; stale: boolean } {
  const store = getSessionStorage();
  if (!store) return { entries: [], stale: false };
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return { entries: [], stale: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], stale: true };
  }

  if (!isPendingHighlightArray(parsed)) return { entries: [], stale: true };

  const live = parsed.filter((entry) => now - entry.timestamp <= PENDING_HIGHLIGHT_TTL_MS);
  // Stale when some entries expired: the persisted list no longer matches `live`.
  return { entries: live, stale: live.length !== parsed.length };
}

/** Replaces the whole stash with a single entry — a fresh tap supersedes all prior intents. */
export function stashPendingHighlight(pending: PendingHighlight): void {
  writeEntries([pending]);
}

/**
 * Appends an intent (a queued write that lost permission), applying verse-level
 * last-wins so entries never overlap on verses: the new entry's verses are
 * removed from earlier entries, entries left with zero verses are dropped, then
 * the new entry is appended last. Expired entries are dropped in the process.
 *
 * @param now Injectable clock for tests; defaults to `Date.now()`.
 */
export function appendPendingHighlight(pending: PendingHighlight, now: number = Date.now()): void {
  const existing = readStoredPending(now).entries;
  const claimedVerses = new Set(pending.verses);
  const merged: PendingHighlight[] = [];
  for (const entry of existing) {
    const remaining = entry.verses.filter((verse) => !claimedVerses.has(verse));
    if (remaining.length === 0) continue;
    merged.push({ ...entry, verses: remaining });
  }
  merged.push(pending);
  writeEntries(merged);
}

/**
 * Non-mutating read of the live pending entries (`[]` when there are none, the
 * value is malformed, or all have expired). Unlike {@link readPendingHighlights}
 * this NEVER clears storage, so it is safe to call from pure contexts (e.g.
 * xstate guards) that must not produce side effects.
 *
 * @param now Injectable clock for tests; defaults to `Date.now()`.
 */
export function peekPendingHighlights(now: number = Date.now()): PendingHighlight[] {
  return readStoredPending(now).entries;
}

/**
 * Reads the live pending entries (`[]` when there are none, the value is
 * malformed, or all have expired). Expired / malformed content is cleared or
 * rewritten as a side effect so a stale intent can't linger.
 *
 * @param now Injectable clock for tests; defaults to `Date.now()`.
 */
export function readPendingHighlights(now: number = Date.now()): PendingHighlight[] {
  const { entries, stale } = readStoredPending(now);
  if (stale) {
    if (entries.length === 0) clearPendingHighlight();
    else writeEntries(entries);
  }
  return entries;
}

/** Discards all pending entries. Safe to call when there are none. */
export function clearPendingHighlight(): void {
  const store = getSessionStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
