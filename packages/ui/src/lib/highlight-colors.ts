/**
 * Highlight color rules (YPE-4494): apply stays palette-only; paint and clear
 * accept any valid 6-digit API hex; invalid hex is dropped everywhere.
 */

/** Canonical apply palette (YPE-5058). Persist unmixed lowercase hex, no `#`. */
export const HIGHLIGHT_COLORS = [
  'ffec5b',
  'b4ffc1',
  'bbf4ff',
  'ffdca7',
  'ffcff8',
  'dfdcff',
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** Verse number → hex color for the chapter currently on screen. */
export type HighlightedVerses = Record<number, string>;

const HIGHLIGHT_COLOR_SET: ReadonlySet<string> = new Set(HIGHLIGHT_COLORS);

const HIGHLIGHT_HEX_REGEX = /^[0-9a-f]{6}$/i;

function stripHighlightHexPrefix(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

/** Whether `color` is a valid API highlight hex (6 digits, optional `#` stripped). */
export function isValidHighlightHex(color: string): boolean {
  return HIGHLIGHT_HEX_REGEX.test(stripHighlightHexPrefix(color));
}

/** Lowercases a valid highlight hex, or `null` when invalid. */
export function normalizeHighlightHex(color: string): string | null {
  if (!isValidHighlightHex(color)) return null;
  return stripHighlightHexPrefix(color).toLowerCase();
}

/** Whether `color` is one of the six SDK apply swatches (valid hex required). */
export function isPaletteHighlightColor(color: string): boolean {
  const normalized = normalizeHighlightHex(color);
  if (normalized === null) return false;
  return HIGHLIGHT_COLOR_SET.has(normalized);
}

/** `--yv-background` in light (`#ffffff`) and dark (`#121212`). Not popover `#1c1a1a`. */
export const HIGHLIGHT_SURFACE_BG = {
  light: 'ffffff',
  dark: '121212',
} as const;

/** Light identity. Dark `p = 0.20`. Black-theme `p = 0.25` is unused. */
export const HIGHLIGHT_MIX_P = {
  light: 1,
  dark: 0.2,
} as const;

function hexChannel(hex: string, offset: number): number {
  return parseInt(stripHighlightHexPrefix(hex).slice(offset, offset + 2), 16);
}

function byteToHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

/** `stored * p + surfaceBg * (1 - p)`. Returns unmixed-format lowercase hex, no `#`. */
export function mixSrgb(stored: string, surfaceBg: string, p: number): string {
  const q = 1 - p;
  const r = hexChannel(stored, 0) * p + hexChannel(surfaceBg, 0) * q;
  const g = hexChannel(stored, 2) * p + hexChannel(surfaceBg, 2) * q;
  const b = hexChannel(stored, 4) * p + hexChannel(surfaceBg, 4) * q;
  return `${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

export function highlightFillHex(stored: string, theme: 'light' | 'dark'): string {
  switch (theme) {
    case 'light':
      return mixSrgb(stored, HIGHLIGHT_SURFACE_BG.light, HIGHLIGHT_MIX_P.light);
    case 'dark':
      return mixSrgb(stored, HIGHLIGHT_SURFACE_BG.dark, HIGHLIGHT_MIX_P.dark);
    default: {
      const _exhaustive: never = theme;
      return _exhaustive;
    }
  }
}

export type VerseActionSwatch = {
  color: string;
  showRemove: boolean;
  key: string;
};

export type BuildVerseActionSwatchesInput = {
  /** Distinct valid colors on the current selection (ANY rule). */
  activeHighlights: ReadonlySet<string>;
  selectedVerses: readonly number[];
  highlightedVerses: Readonly<HighlightedVerses>;
};

/**
 * Builds the verse-action popover swatch row: remove circles (checkmark) for
 * every distinct valid color on the selection — palette or not — then apply
 * circles for palette colors only. Invalid hex never appears.
 */
export function buildVerseActionSwatches({
  activeHighlights,
  selectedVerses,
  highlightedVerses,
}: BuildVerseActionSwatchesInput): VerseActionSwatch[] {
  const normalizedActive = new Set<string>();
  for (const color of activeHighlights) {
    const normalized = normalizeHighlightHex(color);
    if (normalized !== null) normalizedActive.add(normalized);
  }

  const activePalette = HIGHLIGHT_COLORS.filter((color) => normalizedActive.has(color));
  const activeNonPalette = [...normalizedActive]
    .filter((color) => !HIGHLIGHT_COLOR_SET.has(color))
    // Deterministic tray order across renders; palette colors stay in canonical order above.
    .sort();

  const removeColors = [...activePalette, ...activeNonPalette];

  const highlightedVerseCount = selectedVerses.filter((verse) => highlightedVerses[verse]).length;
  const unHighlightedCount = selectedVerses.length - highlightedVerseCount;
  const allPaletteColorsActive = HIGHLIGHT_COLORS.every((color) => normalizedActive.has(color));
  const showAllApplyColors =
    !allPaletteColorsActive && (unHighlightedCount > 0 || normalizedActive.size > 1);
  const colorsToApply = showAllApplyColors
    ? HIGHLIGHT_COLORS
    : HIGHLIGHT_COLORS.filter((color) => !normalizedActive.has(color));

  return [
    ...removeColors.map((color) => ({ color, showRemove: true, key: `${color}-clear` })),
    ...colorsToApply.map((color) => ({ color, showRemove: false, key: `${color}-apply` })),
  ];
}
