import { describe, it, expect } from 'vitest';
import { formatUsfmForDisplay } from '../utils/reference';

describe('formatUsfmForDisplay', () => {
  it('formats a full book.chapter.verse reference', () => {
    expect(formatUsfmForDisplay('JHN.3.16')).toBe('JOHN 3:16');
  });

  it('formats a verse range', () => {
    expect(formatUsfmForDisplay('GEN.1.1-3')).toBe('GENESIS 1:1-3');
  });

  it('formats a chapter-only reference', () => {
    expect(formatUsfmForDisplay('PSA.23')).toBe('PSALMS 23');
  });

  it('formats a book-only reference', () => {
    expect(formatUsfmForDisplay('ROM')).toBe('ROMANS');
  });

  it('returns unknown book codes as-is in uppercase', () => {
    expect(formatUsfmForDisplay('XYZ.1.2')).toBe('XYZ 1:2');
  });

  it('handles numbered book codes', () => {
    expect(formatUsfmForDisplay('1CO.13.4')).toBe('1 CORINTHIANS 13:4');
    expect(formatUsfmForDisplay('2PE.3.9')).toBe('2 PETER 3:9');
  });

  it('returns empty string uppercased for empty input', () => {
    expect(formatUsfmForDisplay('')).toBe('');
  });

  it('handles a multi-chapter passage reference', () => {
    expect(formatUsfmForDisplay('LUK.1.39-45')).toBe('LUKE 1:39-45');
  });
});
