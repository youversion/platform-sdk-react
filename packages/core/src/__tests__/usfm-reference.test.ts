import { describe, expect, it } from 'vitest';
import { parseUsfmReference } from '../usfm-reference';

describe('parseUsfmReference', () => {
  it.each([
    ['JHN.6', { book: 'JHN', chapter: '6', verses: [] }],
    ['JHN.6.9', { book: 'JHN', chapter: '6', verses: [9] }],
    ['JHN.6.9-11', { book: 'JHN', chapter: '6', verses: [9, 10, 11] }],
    ['JHN.6.9-9', { book: 'JHN', chapter: '6', verses: [9] }],
    ['1JN.1.1', { book: '1JN', chapter: '1', verses: [1] }],
    ['ZZZ.1.1', { book: 'ZZZ', chapter: '1', verses: [1] }],
    ['REV.22.20-21', { book: 'REV', chapter: '22', verses: [20, 21] }],
  ] as const)('parses %s', (usfm, expected) => {
    expect(parseUsfmReference(usfm)).toEqual(expected);
  });

  it.each([
    '',
    'JHN',
    'jhn.6.9',
    'JOHN.6.9',
    'JHN.0.1',
    'JHN.1.0',
    'JHN.1.1-0',
    'JHN.1.5-3',
    'JHN.6.9-8',
    'JHN.6.9-',
    'JHN..9',
    'MAT.1.1-2-3',
    'JHN.6.9007199254740992',
    'JHN.6.1-100000',
  ])('rejects %s', (usfm) => {
    expect(parseUsfmReference(usfm)).toBeNull();
  });

  it('rejects unsafe integer verse ranges without hanging', () => {
    expect(parseUsfmReference('JHN.6.9007199254740992-9007199254740993')).toBeNull();
    expect(parseUsfmReference('JHN.6.9007199254740991-9007199254740992')).toBeNull();
  }, 1000);

  it('parses a full Psalm 119 range', () => {
    const parsed = parseUsfmReference('PSA.119.1-176');
    expect(parsed?.book).toBe('PSA');
    expect(parsed?.chapter).toBe('119');
    expect(parsed?.verses[0]).toBe(1);
    expect(parsed?.verses[175]).toBe(176);
    expect(parsed?.verses).toHaveLength(176);
  });
});
