import { describe, expect, it } from 'vitest';
import {
  HIGHLIGHT_COLORS,
  buildVerseActionSwatches,
  highlightFillColorMix,
  highlightMixP,
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

  it('highlightFillColorMix mixes the stored hex against the live surface token', () => {
    expect(highlightFillColorMix('ffec5b')).toBe(
      'color-mix(in srgb, #ffec5b calc(var(--yv-highlight-mix-p) * 100%), var(--yv-background))',
    );
    expect(highlightFillColorMix('#FFEC5B')).toBe(
      'color-mix(in srgb, #ffec5b calc(var(--yv-highlight-mix-p) * 100%), var(--yv-background))',
    );
    expect(highlightFillColorMix('fffe00')).toBe(
      'color-mix(in srgb, #fffe00 calc(var(--yv-highlight-mix-p) * 100%), var(--yv-background))',
    );
  });

  it('highlightFillColorMix mixes drawer dots against --yv-card', () => {
    expect(highlightFillColorMix('ffec5b', 'card')).toBe(
      'color-mix(in srgb, #ffec5b calc(var(--yv-highlight-mix-p) * 100%), var(--yv-card))',
    );
  });

  it('highlightFillColorMix drops invalid hex', () => {
    expect(highlightFillColorMix('not-a-color')).toBeNull();
  });

  it('highlightMixP is 1 in light and 0.2 in dark', () => {
    expect(highlightMixP('light')).toBe(1);
    expect(highlightMixP('dark')).toBe(0.2);
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
