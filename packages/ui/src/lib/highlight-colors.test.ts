import { describe, expect, it } from 'vitest';
import {
  HIGHLIGHT_COLORS,
  buildVerseActionSwatches,
  highlightFillHex,
  isPaletteHighlightColor,
  isValidHighlightHex,
  mixSrgb,
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

  it('HIGHLIGHT_COLORS is the six apply swatches', () => {
    expect(HIGHLIGHT_COLORS).toEqual([
      'ffec5b',
      'b4ffc1',
      'bbf4ff',
      'ffdca7',
      'ffcff8',
      'dfdcff',
    ]);
  });

  it('isPaletteHighlightColor accepts the six apply colors only', () => {
    expect(isPaletteHighlightColor('ffec5b')).toBe(true);
    expect(isPaletteHighlightColor('FFEC5B')).toBe(true);
    expect(isPaletteHighlightColor('b4ffc1')).toBe(true);
    expect(isPaletteHighlightColor('bbf4ff')).toBe(true);
    expect(isPaletteHighlightColor('ffdca7')).toBe(true);
    expect(isPaletteHighlightColor('ffcff8')).toBe(true);
    expect(isPaletteHighlightColor('dfdcff')).toBe(true);
    expect(isPaletteHighlightColor('abcdef')).toBe(false);
    expect(isPaletteHighlightColor('invalid')).toBe(false);
  });

  it('isPaletteHighlightColor rejects the old five apply hexes', () => {
    expect(isPaletteHighlightColor('fffe00')).toBe(false);
    expect(isPaletteHighlightColor('5dff79')).toBe(false);
    expect(isPaletteHighlightColor('00d6ff')).toBe(false);
    expect(isPaletteHighlightColor('ffc66f')).toBe(false);
    expect(isPaletteHighlightColor('ff95ef')).toBe(false);
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
      activeHighlights: new Set(['#FFEC5B', 'B4FFC1']),
      selectedVerses: [1, 2],
      highlightedVerses: { 1: 'ffec5b', 2: 'b4ffc1' },
    });

    expect(swatches.filter((swatch) => swatch.showRemove).map((swatch) => swatch.color)).toEqual([
      HIGHLIGHT_COLORS[0],
      HIGHLIGHT_COLORS[1],
    ]);
  });

  it('mixSrgb is identity in light (p = 1.00)', () => {
    expect(mixSrgb('ffec5b', 'ffffff', 1)).toBe('ffec5b');
    expect(mixSrgb('#ffec5b', '#ffffff', 1)).toBe('ffec5b');
    expect(mixSrgb('fffe00', 'ffffff', 1)).toBe('fffe00');
  });

  it('mixSrgb mixes dark p = 0.20 against #121212', () => {
    expect(mixSrgb('ffec5b', '121212', 0.2)).toBe('413e21');
    expect(mixSrgb('b4ffc1', '#121212', 0.2)).toBe('324135');
    expect(mixSrgb('bbf4ff', '121212', 0.2)).toBe('343f41');
    expect(mixSrgb('ffdca7', '121212', 0.2)).toBe('413a30');
    expect(mixSrgb('ffcff8', '121212', 0.2)).toBe('413840');
    expect(mixSrgb('dfdcff', '121212', 0.2)).toBe('3b3a41');
    expect(mixSrgb('fffe00', '121212', 0.2)).toBe('41410e');
  });

  it('highlightFillHex defaults to the reader surface', () => {
    expect(highlightFillHex('ffec5b', 'light')).toBe('ffec5b');
    expect(highlightFillHex('ffec5b', 'dark')).toBe('413e21');
  });

  it('highlightFillHex mixes dark p = 0.20 against a card surface', () => {
    // `--yv-card` dark is `--yv-gray-45` `#232121`. Same p, different surface.
    expect(mixSrgb('ffec5b', '232121', 0.2)).toBe('4f4a2d');
    expect(highlightFillHex('ffec5b', 'dark', '232121')).toBe('4f4a2d');
    expect(highlightFillHex('ffec5b', 'light', 'fcfafa')).toBe('ffec5b');
  });

  it('leftover fffe00 is not an apply swatch and still clears', () => {
    const empty = buildVerseActionSwatches({
      activeHighlights: new Set(),
      selectedVerses: [1],
      highlightedVerses: {},
    });
    expect(empty.filter((swatch) => !swatch.showRemove).map((swatch) => swatch.color)).toEqual([
      ...HIGHLIGHT_COLORS,
    ]);
    expect(empty.some((swatch) => swatch.color === 'fffe00')).toBe(false);

    const leftover = buildVerseActionSwatches({
      activeHighlights: new Set(['fffe00']),
      selectedVerses: [1],
      highlightedVerses: { 1: 'fffe00' },
    });
    expect(leftover.filter((swatch) => swatch.showRemove)).toEqual([
      { color: 'fffe00', showRemove: true, key: 'fffe00-clear' },
    ]);
    expect(leftover.filter((swatch) => !swatch.showRemove).map((swatch) => swatch.color)).toEqual([
      ...HIGHLIGHT_COLORS,
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
