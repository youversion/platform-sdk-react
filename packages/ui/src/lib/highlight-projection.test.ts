import { describe, it, expect } from 'vitest';
import type { Highlight } from '@youversion/platform-core';
import {
  deriveHighlightedVerses,
  expandPassageId,
  filterHighlightsForPassage,
  parseChapterScopeFromUsfm,
} from './highlight-projection';

describe('expandPassageId', () => {
  it('expands a single-verse USFM', () => {
    expect(expandPassageId('JHN.3.16')).toEqual({ book: 'JHN', chapter: '3', verses: [16] });
  });

  it('expands a verse-range USFM into every verse in the range', () => {
    expect(expandPassageId('JHN.3.16-18')).toEqual({
      book: 'JHN',
      chapter: '3',
      verses: [16, 17, 18],
    });
  });

  it('expands a single-verse range (N-N) to one verse', () => {
    expect(expandPassageId('PSA.23.1-1')).toEqual({ book: 'PSA', chapter: '23', verses: [1] });
  });

  it('handles numbered book codes', () => {
    expect(expandPassageId('1CO.13.4-7')).toEqual({
      book: '1CO',
      chapter: '13',
      verses: [4, 5, 6, 7],
    });
  });

  it('returns null for a chapter-scope USFM (not a highlightable unit)', () => {
    expect(expandPassageId('JHN.3')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(expandPassageId('')).toBeNull();
    expect(expandPassageId('JHN')).toBeNull();
    expect(expandPassageId('JHN.3.')).toBeNull();
    expect(expandPassageId('JHN..16')).toBeNull();
    expect(expandPassageId('.3.16')).toBeNull();
    expect(expandPassageId('JHN.3.abc')).toBeNull();
    expect(expandPassageId('JHN.3.16-')).toBeNull();
    expect(expandPassageId('JHN.3.-18')).toBeNull();
    expect(expandPassageId('JHN.3.16-18-20')).toBeNull();
    expect(expandPassageId('JHN.3.16.18')).toBeNull();
  });

  it('returns null for a reversed range', () => {
    expect(expandPassageId('JHN.3.18-16')).toBeNull();
  });

  it('returns null for verse 0', () => {
    expect(expandPassageId('JHN.3.0')).toBeNull();
    expect(expandPassageId('JHN.3.0-2')).toBeNull();
  });

  it('returns null for an implausibly large range (defensive cap)', () => {
    expect(expandPassageId('JHN.3.1-100000')).toBeNull();
  });
});

describe('deriveHighlightedVerses', () => {
  const highlight = (version_id: number, passage_id: string, color: string): Highlight => ({
    version_id,
    passage_id,
    color,
  });

  it('projects matching per-verse and range entries into a verse->color map', () => {
    const map = deriveHighlightedVerses(
      [highlight(111, 'JHN.3.16', 'fffe00'), highlight(111, 'JHN.3.18-19', '5dff79')],
      111,
      'JHN',
      '3',
    );
    expect(map).toEqual({ 16: 'fffe00', 18: '5dff79', 19: '5dff79' });
  });

  it('drops invalid hex and paints valid non-palette colors', () => {
    const map = deriveHighlightedVerses(
      [
        highlight(111, 'JHN.3.16', 'gggggg'),
        highlight(111, 'JHN.3.17', 'abcdef'),
        highlight(111, 'JHN.3.18', 'FFFE00'),
      ],
      111,
      'JHN',
      '3',
    );
    expect(map).toEqual({ 17: 'abcdef', 18: 'fffe00' });
  });

  it('accepts valid non-palette hex', () => {
    const map = deriveHighlightedVerses([highlight(111, 'JHN.3.16', 'abcdef')], 111, 'JHN', '3');
    expect(map).toEqual({ 16: 'abcdef' });
  });

  it('ignores entries for other versions', () => {
    const map = deriveHighlightedVerses([highlight(222, 'JHN.3.16', 'fffe00')], 111, 'JHN', '3');
    expect(map).toEqual({});
  });

  it('ignores entries for other books or chapters', () => {
    const map = deriveHighlightedVerses(
      [
        highlight(111, 'GEN.3.16', 'fffe00'),
        highlight(111, 'JHN.4.16', 'fffe00'),
        highlight(111, 'JHN.3.16', '00d6ff'),
      ],
      111,
      'JHN',
      '3',
    );
    expect(map).toEqual({ 16: '00d6ff' });
  });

  it('ignores unexpandable passage ids without dropping valid ones', () => {
    const map = deriveHighlightedVerses(
      [highlight(111, 'JHN.3', 'fffe00'), highlight(111, 'JHN.3.2', '5dff79')],
      111,
      'JHN',
      '3',
    );
    expect(map).toEqual({ 2: '5dff79' });
  });

  it('lets later entries win on verse collisions', () => {
    const map = deriveHighlightedVerses(
      [highlight(111, 'JHN.3.16-17', 'fffe00'), highlight(111, 'JHN.3.17', 'ff95ef')],
      111,
      'JHN',
      '3',
    );
    expect(map).toEqual({ 16: 'fffe00', 17: 'ff95ef' });
  });

  it('normalizes colors to lowercase (uppercase accepted at the boundary)', () => {
    const map = deriveHighlightedVerses([highlight(111, 'JHN.3.16', 'FFFE00')], 111, 'JHN', '3');
    expect(map).toEqual({ 16: 'fffe00' });
  });

  it('returns an empty map for an empty highlights array', () => {
    expect(deriveHighlightedVerses([], 111, 'JHN', '3')).toEqual({});
  });
});

describe('parseChapterScopeFromUsfm', () => {
  it('parses a chapter-scope USFM', () => {
    expect(parseChapterScopeFromUsfm('JHN.3')).toEqual({ book: 'JHN', chapter: '3' });
  });

  it('parses a verse USFM', () => {
    expect(parseChapterScopeFromUsfm('JHN.3.16')).toEqual({ book: 'JHN', chapter: '3' });
  });

  it('parses a verse-range USFM', () => {
    expect(parseChapterScopeFromUsfm('JHN.3.16-18')).toEqual({ book: 'JHN', chapter: '3' });
  });

  it('parses a numbered book code', () => {
    expect(parseChapterScopeFromUsfm('1CO.13.4-7')).toEqual({ book: '1CO', chapter: '13' });
  });

  it('returns null for malformed input', () => {
    expect(parseChapterScopeFromUsfm('')).toBeNull();
    expect(parseChapterScopeFromUsfm('JHN')).toBeNull();
    expect(parseChapterScopeFromUsfm('JHN.')).toBeNull();
    expect(parseChapterScopeFromUsfm('.3')).toBeNull();
  });
});

describe('filterHighlightsForPassage', () => {
  const highlight = (version_id: number, passage_id: string, color: string): Highlight => ({
    version_id,
    passage_id,
    color,
  });

  it('keeps rows that intersect the displayed verse and drops the rest', () => {
    const kept = filterHighlightsForPassage(
      [
        highlight(111, 'JHN.3.16', 'fffe00'),
        highlight(111, 'JHN.3.16-18', '5dff79'),
        highlight(111, 'JHN.3.17', '00d6ff'),
        highlight(111, 'JHN.4.1', 'ffc66f'),
        highlight(111, 'JHN.3', 'ff95ef'),
      ],
      'JHN.3.16',
    );
    expect(kept).toEqual([
      highlight(111, 'JHN.3.16', 'fffe00'),
      highlight(111, 'JHN.3.16-18', '5dff79'),
    ]);
  });

  it('returns an empty list when the display USFM is not a verse unit', () => {
    expect(filterHighlightsForPassage([highlight(111, 'JHN.3.16', 'fffe00')], 'JHN.3')).toEqual([]);
  });
});
