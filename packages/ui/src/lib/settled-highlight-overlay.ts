/**
 * A short-lived record of highlight writes the API has accepted but a read
 * replica may not reflect yet.
 *
 * This is not the canonical highlight store: account highlights remain
 * server-owned. The overlay only bridges read-after-write lag across a provider
 * unmount/remount (for example, leaving a demos route and coming back). Entries
 * live in sessionStorage, expire quickly, and are isolated by app key + user.
 */
import {
  getSessionStorage,
  removeStorageItem,
  setStorageItem,
} from '@youversion/platform-core';

export type SettledHighlightScope = {
  versionId: number;
  book: string;
  chapter: string;
};

export type SettledHighlightWrite = {
  kind: 'apply' | 'remove';
  color: string;
  verses: number[];
  scope: SettledHighlightScope;
};

export type SettledHighlightOverlay = Record<number, string | null>;

type SettledHighlightEntry = SettledHighlightScope & {
  verse: number;
  color: string | null;
  timestamp: number;
};

const STORAGE_PREFIX = 'youversion-platform:settled-highlight-overlay:v1';

/** Long enough to cover replica lag without becoming a second highlight store. */
export const SETTLED_HIGHLIGHT_OVERLAY_TTL_MS = 5 * 60 * 1000;

/** Bounds storage even if a user highlights many passages inside the TTL. */
const MAX_ENTRIES = 500;

type StoredRead = {
  entries: SettledHighlightEntry[];
  stale: boolean;
};

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

function storageKey(appKey: string, userId: string): string {
  return `${STORAGE_PREFIX}:${encodeURIComponent(appKey)}:${encodeURIComponent(userId)}`;
}

function scopesEqual(a: SettledHighlightScope, b: SettledHighlightScope): boolean {
  return a.versionId === b.versionId && a.book === b.book && a.chapter === b.chapter;
}

function isText(value: JsonValue | undefined): value is string {
  return Object.prototype.toString.call(value) === '[object String]';
}

function isFiniteNumber(value: JsonValue | undefined): value is number {
  return Object.prototype.toString.call(value) === '[object Number]' && Number.isFinite(value);
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && Object.prototype.toString.call(value) === '[object Object]';
}

function parseEntry(entry: JsonObject): SettledHighlightEntry | undefined {
  const versionId = entry.versionId;
  const book = entry.book;
  const chapter = entry.chapter;
  const verse = entry.verse;
  const color = entry.color;
  const timestamp = entry.timestamp;
  if (!isFiniteNumber(versionId) || !isText(book) || !isText(chapter)) return undefined;
  if (!isFiniteNumber(verse) || !Number.isInteger(verse) || verse <= 0) return undefined;
  if (color !== null && (!isText(color) || !/^[0-9a-f]{6}$/u.test(color))) return undefined;
  if (!isFiniteNumber(timestamp)) return undefined;
  return { versionId, book, chapter, verse, color, timestamp };
}

function readStored(appKey: string, userId: string, now: number): StoredRead {
  const raw = getSessionStorage()?.getItem(storageKey(appKey, userId));
  if (!raw) return { entries: [], stale: false };

  let parsed: JsonValue;
  try {
    // SAFETY: JSON.parse returns untyped input. The loop below validates every
    // collection member and field before constructing a domain entry.
    parsed = JSON.parse(raw) as JsonValue;
  } catch {
    return { entries: [], stale: true };
  }
  if (!Array.isArray(parsed)) return { entries: [], stale: true };
  const parsedEntries: SettledHighlightEntry[] = [];
  for (const item of parsed) {
    if (!isJsonObject(item)) return { entries: [], stale: true };
    const entry = parseEntry(item);
    if (entry === undefined) return { entries: [], stale: true };
    parsedEntries.push(entry);
  }

  const entries = parsedEntries.filter(
    (entry) => now - entry.timestamp <= SETTLED_HIGHLIGHT_OVERLAY_TTL_MS,
  );
  return { entries, stale: entries.length !== parsedEntries.length };
}

function writeStored(appKey: string, userId: string, entries: SettledHighlightEntry[]): void {
  const key = storageKey(appKey, userId);
  if (entries.length === 0) {
    removeStorageItem(getSessionStorage(), key);
    return;
  }
  setStorageItem(getSessionStorage(), key, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

function overlayForScope(
  entries: SettledHighlightEntry[],
  scope: SettledHighlightScope,
) {
  const overlay: SettledHighlightOverlay = {};
  for (const entry of entries) {
    if (scopesEqual(entry, scope)) overlay[entry.verse] = entry.color;
  }
  return overlay;
}

/** Pure read used during render; cleanup/reconciliation stays in an effect. */
export function readSettledHighlightOverlay(
  appKey: string,
  userId: string,
  scope: SettledHighlightScope,
  now: number = Date.now(),
): SettledHighlightOverlay {
  if (!appKey || !userId) return {};
  return overlayForScope(readStored(appKey, userId, now).entries, scope);
}

/**
 * Records only verses whose write request succeeded. A later write to the same
 * verse wins, matching the in-memory optimistic overlay.
 */
export function persistSettledHighlightWrite(
  appKey: string,
  userId: string,
  write: SettledHighlightWrite,
  now: number = Date.now(),
): void {
  if (!appKey || !userId || write.verses.length === 0) return;

  const existing = readStored(appKey, userId, now).entries;
  const changedVerses = new Set(write.verses);
  const entries = existing.filter(
    (entry) => !(scopesEqual(entry, write.scope) && changedVerses.has(entry.verse)),
  );
  const color = write.kind === 'apply' ? write.color.toLowerCase() : null;
  for (const verse of changedVerses) {
    if (!Number.isInteger(verse) || verse <= 0) continue;
    entries.push({ ...write.scope, verse, color, timestamp: now });
  }
  writeStored(appKey, userId, entries);
}

/**
 * Reads the current scope's overlay and prunes entries that have expired or
 * whose successful apply is now reflected by server truth. Remove tombstones
 * intentionally live until TTL so a later stale replica cannot resurrect a
 * deleted highlight.
 */
export function reconcileSettledHighlightOverlay(
  appKey: string,
  userId: string,
  scope: SettledHighlightScope,
  serverColors: Record<number, string>,
  now: number = Date.now(),
): SettledHighlightOverlay {
  if (!appKey || !userId) return {};

  const stored = readStored(appKey, userId, now);
  const entries = stored.entries.filter((entry) => {
    if (!scopesEqual(entry, scope)) return true;
    if (entry.color === null) return true;
    return serverColors[entry.verse] !== entry.color;
  });
  if (stored.stale || entries.length !== stored.entries.length) {
    writeStored(appKey, userId, entries);
  }
  return overlayForScope(entries, scope);
}
