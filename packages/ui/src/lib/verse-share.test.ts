import { describe, it, expect } from 'vitest';
import { formatVerseNumbers, joinVerseTexts, buildVerseShareText } from './verse-share';

describe('formatVerseNumbers', () => {
  it('renders a single verse', () => {
    expect(formatVerseNumbers([5])).toBe('5');
  });

  it('collapses a contiguous run into a range', () => {
    expect(formatVerseNumbers([1, 2, 3])).toBe('1-3');
  });

  it('keeps non-contiguous verses comma-separated', () => {
    expect(formatVerseNumbers([1, 3])).toBe('1,3');
  });

  it('mixes ranges and singletons', () => {
    expect(formatVerseNumbers([1, 2, 4, 5, 7])).toBe('1-2,4-5,7');
  });

  it('sorts and de-duplicates first', () => {
    expect(formatVerseNumbers([3, 1, 2, 2])).toBe('1-3');
  });
});

describe('joinVerseTexts', () => {
  it('joins contiguous verses with a single space', () => {
    expect(joinVerseTexts([1, 2], { 1: 'First.', 2: 'Second.' })).toBe('First. Second.');
  });

  it('inserts an ellipsis where the selection skips a verse', () => {
    expect(joinVerseTexts([1, 3], { 1: 'First.', 3: 'Third.' })).toBe('First. ... Third.');
  });

  it('trims each verse before joining', () => {
    expect(joinVerseTexts([1, 2], { 1: '  First.  ', 2: '  Second.  ' })).toBe('First. Second.');
  });
});

describe('buildVerseShareText', () => {
  it('matches the bible.com format: curly-quoted text, blank line, reference', () => {
    const result = buildVerseShareText({
      verses: [1, 3],
      textByVerse: {
        1: 'Better the poor whose walk is blameless than a fool whose lips are perverse.',
        3: 'A person’s own folly leads to their ruin, yet their heart rages against the Lord.',
      },
      bookName: 'Proverbs',
      chapter: '19',
      versionAbbreviation: 'NIV',
    });

    expect(result).toBe(
      '“Better the poor whose walk is blameless than a fool whose lips are perverse. ... ' +
        'A person’s own folly leads to their ruin, yet their heart rages against the Lord.”' +
        '\n\nProverbs 19:1,3 NIV',
    );
  });

  it('formats a single verse', () => {
    const result = buildVerseShareText({
      verses: [1],
      textByVerse: { 1: 'There is therefore now no condemnation.' },
      bookName: 'Romans',
      chapter: 8,
      versionAbbreviation: 'BSB',
    });

    expect(result).toBe('“There is therefore now no condemnation.”\n\nRomans 8:1 BSB');
  });

  it('omits a trailing space when the version abbreviation is missing', () => {
    const result = buildVerseShareText({
      verses: [1],
      textByVerse: { 1: 'In the beginning.' },
      bookName: 'Genesis',
      chapter: 1,
      versionAbbreviation: '',
    });

    expect(result).toBe('“In the beginning.”\n\nGenesis 1:1');
  });
});
