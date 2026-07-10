/**
 * A user's stashed highlight intent while the highlight auth flow is in flight
 * (YPE-1034). Persisted to `sessionStorage` so it survives the full-page OAuth /
 * data-exchange redirect round-trip, and expires (~10 min) so an abandoned
 * round-trip can never silently apply a highlight during a much later sign-in.
 *
 * This is NOT highlight data (highlights are server-only account data, ADR-001);
 * it is a short-lived intent record, discarded on decline, cancel, failure, or
 * successful apply.
 */
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
  /** Epoch ms when stashed; drives expiry. */
  timestamp: number;
};

const STORAGE_KEY = 'youversion-platform:pending-highlight';

/** Pending highlights older than this on read are treated as expired. */
export const PENDING_HIGHLIGHT_TTL_MS = 10 * 60 * 1000;

function getSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    // Access can throw in sandboxed/blocked-storage contexts.
    return null;
  }
}

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

/** Stashes the pending highlight, replacing any existing one. */
export function stashPendingHighlight(pending: PendingHighlight): void {
  const store = getSessionStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Quota / disabled storage — nothing to do; the flow simply won't resume.
  }
}

/**
 * Reads the pending highlight, or `null` when there is none, it is malformed, or
 * it has expired. Expired / malformed entries are cleared as a side effect so a
 * stale intent can't linger.
 *
 * @param now Injectable clock for tests; defaults to `Date.now()`.
 */
export function readPendingHighlight(now: number = Date.now()): PendingHighlight | null {
  const store = getSessionStorage();
  if (!store) return null;
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearPendingHighlight();
    return null;
  }

  if (!isPendingHighlight(parsed)) {
    clearPendingHighlight();
    return null;
  }

  if (now - parsed.timestamp > PENDING_HIGHLIGHT_TTL_MS) {
    clearPendingHighlight();
    return null;
  }

  return parsed;
}

/** Discards the pending highlight. Safe to call when there is none. */
export function clearPendingHighlight(): void {
  const store = getSessionStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
