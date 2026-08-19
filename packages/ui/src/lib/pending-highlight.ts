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
import { getSessionStorage, removeStorageItem, setStorageItem } from '@youversion/platform-core';

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

type StoredPendingRead = {
  entries: PendingHighlight[];
  stale: boolean;
};

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

function isText(value: JsonValue): value is string {
  return Object.prototype.toString.call(value) === '[object String]';
}

function isFiniteNumber(value: JsonValue): value is number {
  return Object.prototype.toString.call(value) === '[object Number]' && Number.isFinite(value);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && Object.prototype.toString.call(value) === '[object Object]';
}

function parsePendingHighlight(item: JsonObject): PendingHighlight | undefined {
  const verses = item.verses;
  const color = item.color;
  const book = item.book;
  const chapter = item.chapter;
  const versionId = item.versionId;
  const timestamp = item.timestamp;
  if (!Array.isArray(verses) || !verses.every(isFiniteNumber)) return undefined;
  if (!isText(color) || !isText(book) || !isText(chapter)) return undefined;
  if (!isFiniteNumber(versionId) || !isFiniteNumber(timestamp)) return undefined;
  return {
    verses,
    color,
    versionId,
    book,
    chapter,
    timestamp,
  };
}

function parsePendingHighlightList(raw: string): PendingHighlight[] | undefined {
  let parsed: JsonValue;
  try {
    // SAFETY: JSON.parse returns any. parsePendingHighlight checks each field
    // before the list is used.
    parsed = JSON.parse(raw) as JsonValue;
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;
  const entries: PendingHighlight[] = [];
  for (const item of parsed) {
    if (!isJsonObject(item)) continue;
    const entry = parsePendingHighlight(item);
    if (entry === undefined) return undefined;
    entries.push(entry);
  }
  return entries;
}

function writeEntries(entries: PendingHighlight[]): void {
  // A rejected write (quota / disabled storage) is tolerable here: the flow
  // simply won't resume after the redirect.
  setStorageItem(getSessionStorage(), STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Reads the stored entries, keeping only the live (unexpired) ones. `stale` is
 * `true` when the raw value was malformed or any entry was dropped as expired, so
 * a caller that mutates storage knows the persisted value needs rewriting or
 * clearing. Never touches storage; callers decide.
 */
function readStoredPending(now: number): StoredPendingRead {
  const store = getSessionStorage();
  if (!store) return { entries: [], stale: false };
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return { entries: [], stale: false };

  const parsed = parsePendingHighlightList(raw);
  if (parsed === undefined) return { entries: [], stale: true };

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
  removeStorageItem(getSessionStorage(), STORAGE_KEY);
}
