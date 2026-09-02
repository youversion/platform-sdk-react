import * as z from 'zod/mini';
import type { BibleVersion, Collection, Language } from './types';
import { versionFilterState, type VersionFilterState } from './version-filter-state';

export type VersionFilterCandidate = {
  id: number;
  languageTag?: string;
};

export function isVersionFilterActive(): boolean {
  return (
    versionFilterState.permittedVersionIds !== undefined ||
    versionFilterState.permittedLanguageTags !== undefined ||
    (versionFilterState.excludedVersionIds?.length ?? 0) > 0
  );
}

export function isLanguageFilterActive(): boolean {
  return versionFilterState.permittedLanguageTags !== undefined;
}

export function getVersionFilterSnapshot(): VersionFilterState {
  return {
    permittedVersionIds: versionFilterState.permittedVersionIds,
    excludedVersionIds: versionFilterState.excludedVersionIds,
    permittedLanguageTags: versionFilterState.permittedLanguageTags,
  };
}

/** True when the id alone is enough to refuse, without `language_tag`. */
export function isVersionIdDecidablyUnusable(versionId: number): boolean {
  const excluded = versionFilterState.excludedVersionIds;
  if (excluded?.includes(versionId)) return true;

  const permittedIds = versionFilterState.permittedVersionIds;
  return permittedIds !== undefined && !permittedIds.includes(versionId);
}

export function isUsableBibleVersion(candidate: VersionFilterCandidate): boolean {
  if (isVersionIdDecidablyUnusable(candidate.id)) return false;

  const permittedTags = versionFilterState.permittedLanguageTags;
  if (permittedTags === undefined) return true;
  if (candidate.languageTag === undefined) return false;
  return permittedTags.includes(candidate.languageTag);
}

export function isUsableLanguageTag(languageTag: string): boolean {
  const permittedTags = versionFilterState.permittedLanguageTags;
  return permittedTags === undefined || permittedTags.includes(languageTag);
}

export function throwUnusableBibleVersion(): never {
  throw Object.assign(new Error('This app is not allowed to access this Bible version.'), {
    status: 403,
  });
}

export function fieldsNeededForVersionFilter(
  fields?: readonly (keyof BibleVersion)[],
): (keyof BibleVersion)[] | undefined {
  if (!fields) return undefined;
  if (!isVersionFilterActive()) return [...fields];

  const next = new Set<keyof BibleVersion>(fields);
  next.add('id');
  if (isLanguageFilterActive()) {
    next.add('language_tag');
  }
  return [...next];
}

export function fieldsNeededForLanguageFilter(
  fields?: readonly (keyof Language)[],
): (keyof Language)[] | undefined {
  if (!fields) return undefined;
  if (!isLanguageFilterActive()) return [...fields];

  const next = new Set<keyof Language>(fields);
  next.add('id');
  return [...next];
}

/** Resume token for leftover usable rows on a server page. Never send to the API. */
const FILTER_PAGE_CURSOR_PREFIX = 'yv-vf1:';

const FilterPageCursorSchema = z.object({
  t: z.nullable(z.string()),
  s: z.int().check(z.nonnegative()),
});

type FilterPageCursor = z.infer<typeof FilterPageCursorSchema>;

type FilterPageStart = {
  pageToken?: string;
  skip: number;
};

function encodeFilterPageCursor(pageToken: string | null, skip: number): string {
  return `${FILTER_PAGE_CURSOR_PREFIX}${JSON.stringify({ t: pageToken, s: skip })}`;
}

function decodeFilterPageCursor(token: string): FilterPageCursor | undefined {
  if (!token.startsWith(FILTER_PAGE_CURSOR_PREFIX)) return undefined;
  try {
    const parsed = FilterPageCursorSchema.safeParse(
      JSON.parse(token.slice(FILTER_PAGE_CURSOR_PREFIX.length)),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function resolveFilterPageStart(startToken?: string): FilterPageStart {
  if (!startToken) return { skip: 0 };
  const cursor = decodeFilterPageCursor(startToken);
  if (!cursor) return { pageToken: startToken, skip: 0 };
  return { pageToken: cursor.t ?? undefined, skip: cursor.s };
}

export async function collectFilteredPage<T>(
  fetchPage: (pageToken?: string) => Promise<Collection<T>>,
  isUsable: (item: T) => boolean,
  pageSize?: number | '*',
  startToken?: string,
): Promise<Collection<T>> {
  const start = resolveFilterPageStart(startToken);

  if (pageSize === '*') {
    const first = await fetchPage(start.pageToken);
    const data = first.data.filter(isUsable).slice(start.skip);
    let token = first.next_page_token;
    while (token) {
      const next = await fetchPage(token);
      data.push(...next.data.filter(isUsable));
      token = next.next_page_token;
    }
    return { data, next_page_token: null, total_size: data.length };
  }

  let fetchToken = start.pageToken;
  let skip = start.skip;
  const first = await fetchPage(fetchToken);
  const target = pageSize ?? first.data.length;
  const collected: T[] = [];
  let page = first;

  while (true) {
    const usable = page.data.filter(isUsable).slice(skip);
    const take = usable.slice(0, target - collected.length);
    collected.push(...take);

    if (usable.length > take.length) {
      return {
        data: collected,
        next_page_token: encodeFilterPageCursor(fetchToken ?? null, skip + take.length),
        total_size: first.total_size,
      };
    }

    skip = 0;
    if (collected.length >= target || !page.next_page_token) {
      return {
        data: collected,
        next_page_token: page.next_page_token ?? null,
        total_size: first.total_size,
      };
    }

    fetchToken = page.next_page_token;
    page = await fetchPage(fetchToken);
  }
}
