import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import type { BibleVersion, Collection, Language } from './types';

export type VersionFilterCandidate = {
  id: number;
  languageTag?: string;
};

export function isVersionFilterActive(): boolean {
  return (
    YouVersionPlatformConfiguration.permittedVersionIds !== undefined ||
    YouVersionPlatformConfiguration.permittedLanguageTags !== undefined ||
    (YouVersionPlatformConfiguration.excludedVersionIds?.length ?? 0) > 0
  );
}

/** True when the id alone is enough to refuse, without `language_tag`. */
export function isVersionIdDecidablyUnusable(versionId: number): boolean {
  const excluded = YouVersionPlatformConfiguration.excludedVersionIds;
  if (excluded?.includes(versionId)) return true;

  const permittedIds = YouVersionPlatformConfiguration.permittedVersionIds;
  return permittedIds !== undefined && !permittedIds.includes(versionId);
}

export function isUsableBibleVersion(candidate: VersionFilterCandidate): boolean {
  if (isVersionIdDecidablyUnusable(candidate.id)) return false;

  const permittedTags = YouVersionPlatformConfiguration.permittedLanguageTags;
  if (permittedTags === undefined) return true;
  if (candidate.languageTag === undefined) return false;
  return permittedTags.includes(candidate.languageTag);
}

export function isUsableLanguageTag(languageTag: string): boolean {
  const permittedTags = YouVersionPlatformConfiguration.permittedLanguageTags;
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
  if (YouVersionPlatformConfiguration.permittedLanguageTags !== undefined) {
    next.add('language_tag');
  }
  return [...next];
}

export function fieldsNeededForLanguageFilter(
  fields?: readonly (keyof Language)[],
): (keyof Language)[] | undefined {
  if (!fields) return undefined;
  if (YouVersionPlatformConfiguration.permittedLanguageTags === undefined) return [...fields];

  const next = new Set<keyof Language>(fields);
  next.add('id');
  return [...next];
}

export async function collectFilteredPage<T>(
  fetchPage: (pageToken?: string) => Promise<Collection<T>>,
  isUsable: (item: T) => boolean,
  pageSize?: number | '*',
): Promise<Collection<T>> {
  if (pageSize === '*') {
    const first = await fetchPage();
    const data = [...first.data.filter(isUsable)];
    let token = first.next_page_token;
    while (token) {
      const next = await fetchPage(token);
      data.push(...next.data.filter(isUsable));
      token = next.next_page_token;
    }
    return { data, next_page_token: null, total_size: data.length };
  }

  const first = await fetchPage();
  const target = typeof pageSize === 'number' ? pageSize : first.data.length;
  const usable = [...first.data.filter(isUsable)];
  let token = first.next_page_token;

  while (usable.length < target && token) {
    const next = await fetchPage(token);
    usable.push(...next.data.filter(isUsable));
    token = next.next_page_token;
  }

  return {
    data: usable.slice(0, target),
    next_page_token: token,
    total_size: first.total_size,
  };
}
