import { describe, expect, it } from 'vitest';
import {
  HIGHLIGHT_COLORS,
  buildVerseActionSwatches,
  isPaletteHighlightColor,
  isValidHighlightHex,
  normalizeHighlightHex,
} from './highlight-colors';

describe('highlight-colors', () => {
  it('isValidHighlightHex accepts 6-digit lowercase and uppercase hex', () => {
    expect(isValidHighlightHex('abcdef')).toBe(true);
    expect(isValidHighlightHex('ABCDEF')).toBe(true);
    expect(isValidHighlightHex('#fffe00')).toBe(true);
  });

  it('isValidHighlightHex rejects invalid API colors', () => {
    expect(isValidHighlightHex('gggggg')).toBe(false);
    expect(isValidHighlightHex('abc')).toBe(false);
    expect(isValidHighlightHex('1234567')).toBe(false);
    expect(isValidHighlightHex('')).toBe(false);
  });

  it('normalizeHighlightHex returns lowercase hex for valid input', () => {
    expect(normalizeHighlightHex('ABCDEF')).toBe('abcdef');
    expect(normalizeHighlightHex('#FFFE00')).toBe('fffe00');
  });

  it('normalizeHighlightHex returns null for invalid input', () => {
    expect(normalizeHighlightHex('not-a-color')).toBeNull();
  });

  it('isPaletteHighlightColor recognizes the five SDK palette colors only', () => {
    expect(isPaletteHighlightColor('fffe00')).toBe(true);
    expect(isPaletteHighlightColor('FFFE00')).toBe(true);
    expect(isPaletteHighlightColor('abcdef')).toBe(false);
    expect(isPaletteHighlightColor('invalid')).toBe(false);
  });

  it('buildVerseActionSwatches includes remove swatches for valid non-palette colors at exact hex', () => {
    const custom = 'aabbcc';
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set([custom]),
      selectedVerses: [1],
      highlightedVerses: { 1: custom },
    });

    const remove = swatches.filter((swatch) => swatch.showRemove);
    expect(remove).toEqual([{ color: custom, showRemove: true, key: `${custom}-clear` }]);
    expect(swatches.filter((swatch) => !swatch.showRemove).map((swatch) => swatch.color)).toEqual(
      HIGHLIGHT_COLORS,
    );
  });

  it('buildVerseActionSwatches keeps apply swatches palette-only', () => {
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set<string>(),
      selectedVerses: [1],
      highlightedVerses: {},
    });

    expect(swatches.map((swatch) => swatch.color)).toEqual([...HIGHLIGHT_COLORS]);
    expect(swatches.every((swatch) => !swatch.showRemove)).toBe(true);
  });

  it('buildVerseActionSwatches drops invalid hex from the remove row', () => {
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set(['not-valid', HIGHLIGHT_COLORS[0]]),
      selectedVerses: [1, 2],
      highlightedVerses: { 1: 'not-valid', 2: HIGHLIGHT_COLORS[0] },
    });

    expect(swatches.filter((swatch) => swatch.showRemove)).toEqual([
      { color: HIGHLIGHT_COLORS[0], showRemove: true, key: `${HIGHLIGHT_COLORS[0]}-clear` },
    ]);
  });

  it('buildVerseActionSwatches shows remove for every distinct valid color on a mixed selection (ANY rule)', () => {
    const custom = '112233';
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set([HIGHLIGHT_COLORS[0], custom]),
      selectedVerses: [1, 2],
      highlightedVerses: { 1: HIGHLIGHT_COLORS[0], 2: custom },
    });

    const remove = swatches.filter((swatch) => swatch.showRemove);
    expect(remove.map((swatch) => swatch.color)).toEqual([HIGHLIGHT_COLORS[0], custom]);
    expect(swatches.filter((swatch) => !swatch.showRemove).map((swatch) => swatch.color)).toEqual(
      HIGHLIGHT_COLORS,
    );
  });

  it('shows a remove swatch when non-palette covers only part of the selection (Story 10)', () => {
    const custom = 'aabbcc';
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set([custom]),
      selectedVerses: [1, 2],
      highlightedVerses: { 1: custom },
    });

    expect(swatches.filter((swatch) => swatch.showRemove)).toEqual([
      { color: custom, showRemove: true, key: `${custom}-clear` },
    ]);
  });

  it('normalizes uppercase and #‑prefixed palette colors into the remove row', () => {
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set(['#FFFE00', '5DFF79']),
      selectedVerses: [1, 2],
      highlightedVerses: { 1: 'fffe00', 2: '5dff79' },
    });

    expect(swatches.filter((swatch) => swatch.showRemove).map((swatch) => swatch.color)).toEqual([
      HIGHLIGHT_COLORS[0],
      HIGHLIGHT_COLORS[1],
    ]);
  });

  it('dedupes the same hex when activeHighlights carries multiple casings', () => {
    const custom = 'aabbcc';
    const swatches = buildVerseActionSwatches({
      activeHighlights: new Set([custom, custom.toUpperCase()]),
      selectedVerses: [1],
      highlightedVerses: { 1: custom },
    });

    expect(swatches.filter((swatch) => swatch.showRemove)).toEqual([
      { color: custom, showRemove: true, key: `${custom}-clear` },
    ]);
  });
});
