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

/** Light identity. Dark `p = 0.20`. Black-theme `p = 0.25` is unused. */
export const HIGHLIGHT_MIX_P = {
  light: 1,
  dark: 0.2,
} as const;

export type HighlightFillSurface = 'background' | 'card';

const HIGHLIGHT_FILL_SURFACE_VAR = {
  background: 'var(--yv-background)',
  card: 'var(--yv-card)',
} as const;

export function highlightMixP(theme: 'light' | 'dark'): number {
  switch (theme) {
    case 'light':
      return HIGHLIGHT_MIX_P.light;
    case 'dark':
      return HIGHLIGHT_MIX_P.dark;
    default: {
      const _exhaustive: never = theme;
      return _exhaustive;
    }
  }
}

/**
 * Token-aware sRGB fill. `p` is `--yv-highlight-mix-p` (light 1.00, dark 0.20).
 * Reader fills mix against `--yv-background`; drawer dots pass `'card'`.
 */
export function highlightFillColorMix(
  stored: string,
  surface: HighlightFillSurface = 'background',
): string | null {
  const hex = normalizeHighlightHex(stored);
  if (hex === null) return null;
  switch (surface) {
    case 'background':
    case 'card':
      return `color-mix(in srgb, #${hex} calc(var(--yv-highlight-mix-p) * 100%), ${HIGHLIGHT_FILL_SURFACE_VAR[surface]})`;
    default: {
      const _exhaustive: never = surface;
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
