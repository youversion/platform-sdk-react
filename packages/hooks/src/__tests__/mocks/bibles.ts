import type { BibleBook, BibleChapter, BibleVerse, BibleVersion } from '@youversion/platform-core';

/**
 * Creates a mock Bible version for testing
 * @param overrides Optional properties to override defaults
 */
export const createMockVersion = (overrides?: Partial<BibleVersion>): BibleVersion => ({
  id: 1,
  title: 'King James Version',
  abbreviation: 'KJV',
  copyright: '',
  promotional_content: '',
  info: null,
  publisher_url: null,
  language_tag: 'en',
  localized_abbreviation: 'KJV',
  localized_title: 'King James Version',
  books: [],
  youversion_deep_link: 'https://www.bible.com/versions/1',
  ...overrides,
});

/**
 * Creates a mock Bible book for testing
 * @param overrides Optional properties to override defaults
 */
export const createMockBook = (overrides?: Partial<BibleBook>): BibleBook => ({
  id: 'GEN',
  title: 'Genesis',
  full_title: 'The First Book of Moses, Commonly Called Genesis',
  abbreviation: 'Gen',
  canon: 'old_testament',
  ...overrides,
});

/**
 * Creates a mock Bible chapter for testing
 * @param overrides Optional properties to override defaults
 */
export const createMockChapter = (overrides?: Partial<BibleChapter>): BibleChapter => ({
  id: '1',
  passage_id: 'GEN.1',
  title: '1',
  ...overrides,
});

/**
 * Creates a mock Bible verse for testing
 * @param overrides Optional properties to override defaults
 */
export const createMockVerse = (overrides?: Partial<BibleVerse>): BibleVerse => ({
  id: '1',
  passage_id: 'GEN.1.1',
  title: '1',
  ...overrides,
});
