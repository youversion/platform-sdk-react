import { useState } from 'react';
import { clampSearchText, getLocalStorage, setStorageItem } from '@youversion/platform-core';
import * as z from 'zod/mini';

export const RECENT_SEARCHES_KEY = 'youversion-platform:search:recent-queries';
const MAX_RECENT_SEARCHES = 10;

type RecentSearchHistory = {
  recentSearches: readonly string[];
  rememberSearch: (raw: string) => void;
};

function readRecentSearches(): string[] {
  try {
    const stored = getLocalStorage()?.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed = z.array(z.string()).parse(JSON.parse(stored));
    const queries: string[] = [];
    for (const item of parsed) {
      const query = clampSearchText(item).trim();
      if (query && !queries.some((previous) => previous.toLowerCase() === query.toLowerCase())) {
        queries.push(query);
      }
      if (queries.length === MAX_RECENT_SEARCHES) break;
    }
    return queries;
  } catch {
    // Browser storage may be unavailable or contain an older, invalid value.
    return [];
  }
}

/** Owned by the dialog host so in-memory history survives closing the search panel. */
export function useRecentSearches(): RecentSearchHistory {
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);

  function rememberSearch(raw: string): void {
    const query = clampSearchText(raw).trim();
    if (!query) return;
    const next = [
      query,
      ...recentSearches.filter((previous) => previous.toLowerCase() !== query.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(next);
    setStorageItem(getLocalStorage(), RECENT_SEARCHES_KEY, JSON.stringify(next));
  }

  return { recentSearches, rememberSearch };
}
