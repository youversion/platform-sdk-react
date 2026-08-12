/**
 * Highlight color rules (YPE-4494): apply stays palette-only; paint and clear
 * accept any valid 6-digit API hex; invalid hex is dropped everywhere.
 */

/** Canonical apply palette — yellow, green, blue, orange, pink (matches iOS). */
export const HIGHLIGHT_COLORS = ['fffe00', '5dff79', '00d6ff', 'ffc66f', 'ff95ef'] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

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

/** Whether `color` is one of the five SDK apply swatches (valid hex required). */
export function isPaletteHighlightColor(color: string): boolean {
  const normalized = normalizeHighlightHex(color);
  if (normalized === null) return false;
  return (HIGHLIGHT_COLORS as readonly string[]).includes(normalized);
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
  highlightedVerses: Readonly<Record<number, string>>;
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
    .filter((color) => !(HIGHLIGHT_COLORS as readonly string[]).includes(color))
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
