import type { BibleBook, BiblePassage } from '@youversion/platform-core';

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
 * Creates a mock Bible passage for testing
 * @param overrides Optional properties to override defaults
 */
export const createMockPassage = (overrides?: Partial<BiblePassage>): BiblePassage => ({
  id: 'JHN.3.16',
  content: '<p>For God so loved the world...</p>',
  reference: 'John 3:16',
  ...overrides,
});
