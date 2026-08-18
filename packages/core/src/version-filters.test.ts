import { describe, it, expect } from 'vitest';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import {
  collectFilteredPage,
  fieldsNeededForLanguageFilter,
  fieldsNeededForVersionFilter,
  isUsableBibleVersion,
  isUsableLanguageTag,
  isVersionFilterActive,
  isVersionIdDecidablyUnusable,
  throwUnusableBibleVersion,
} from './version-filters';

function setFilters(filters: {
  permittedVersionIds?: number[];
  excludedVersionIds?: number[];
  permittedLanguageTags?: string[];
}): void {
  YouVersionPlatformConfiguration.permittedVersionIds = filters.permittedVersionIds;
  YouVersionPlatformConfiguration.excludedVersionIds = filters.excludedVersionIds;
  YouVersionPlatformConfiguration.permittedLanguageTags = filters.permittedLanguageTags;
}

function clearFilters(): void {
  setFilters({});
}

describe('version filters', () => {
  it('treats unset lists as no restriction and empty permit lists as permit nothing', () => {
    clearFilters();
    expect(isVersionFilterActive()).toBe(false);
    expect(isUsableBibleVersion({ id: 111, languageTag: 'en' })).toBe(true);
    expect(isVersionIdDecidablyUnusable(111)).toBe(false);

    setFilters({ permittedVersionIds: [] });
    expect(isVersionFilterActive()).toBe(true);
    expect(isUsableBibleVersion({ id: 111, languageTag: 'en' })).toBe(false);
    expect(isVersionIdDecidablyUnusable(111)).toBe(true);

    setFilters({ excludedVersionIds: [] });
    expect(isVersionFilterActive()).toBe(false);
    expect(isUsableBibleVersion({ id: 111, languageTag: 'en' })).toBe(true);
    clearFilters();
  });

  it('ANDs allowlists and lets exclusion win', () => {
    setFilters({
      permittedVersionIds: [111, 206],
      excludedVersionIds: [111],
      permittedLanguageTags: ['en'],
    });

    expect(isUsableBibleVersion({ id: 111, languageTag: 'en' })).toBe(false);
    expect(isUsableBibleVersion({ id: 206, languageTag: 'en' })).toBe(true);
    expect(isUsableBibleVersion({ id: 206, languageTag: 'es' })).toBe(false);
    expect(isUsableBibleVersion({ id: 3034, languageTag: 'en' })).toBe(false);
    expect(isVersionIdDecidablyUnusable(111)).toBe(true);
    expect(isVersionIdDecidablyUnusable(206)).toBe(false);
    expect(isUsableLanguageTag('en')).toBe(true);
    expect(isUsableLanguageTag('es')).toBe(false);

    clearFilters();
  });

  it('fails closed when a language allowlist is set and the tag is missing', () => {
    setFilters({ permittedLanguageTags: ['en'] });
    expect(isUsableBibleVersion({ id: 111 })).toBe(false);
    expect(isVersionIdDecidablyUnusable(111)).toBe(false);
    clearFilters();
  });

  it('throws a 403-shaped refuse and adds filter fields to projections', () => {
    try {
      throwUnusableBibleVersion();
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        status: 403,
        message: 'This app is not allowed to access this Bible version.',
      });
    }

    clearFilters();
    expect(fieldsNeededForVersionFilter(['title'])).toEqual(['title']);

    setFilters({ permittedVersionIds: [111], permittedLanguageTags: ['en'] });
    expect(fieldsNeededForVersionFilter(['title'])).toEqual(['title', 'id', 'language_tag']);
    expect(fieldsNeededForLanguageFilter(['display_names'])).toEqual(['display_names', 'id']);
    clearFilters();
  });

  it('walks pages until a filtered page is full or the server is exhausted', async () => {
    setFilters({ permittedVersionIds: [3, 4] });

    const pages = [
      { data: [{ id: 1 }, { id: 2 }], next_page_token: 'p2' },
      { data: [{ id: 3 }, { id: 5 }], next_page_token: 'p3' },
      { data: [{ id: 4 }], next_page_token: null },
    ];
    let calls = 0;

    const collected = await collectFilteredPage(
      () => {
        const page = pages[calls];
        calls += 1;
        return Promise.resolve(page ?? { data: [], next_page_token: null });
      },
      (item) => isUsableBibleVersion({ id: item.id }),
      2,
    );

    expect(calls).toBe(3);
    expect(collected.data.map((item) => item.id)).toEqual([3, 4]);
    expect(collected.next_page_token).toBeNull();
    clearFilters();
  });
});
