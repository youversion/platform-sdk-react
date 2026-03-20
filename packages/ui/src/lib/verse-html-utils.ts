const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export function getFootnoteMarker(index: number): string {
  const base = LETTERS.length;
  if (base === 0) return String(index + 1);

  let value = index;
  let marker = '';

  do {
    marker = LETTERS[value % base] + marker;
    value = Math.floor(value / base) - 1;
  } while (value >= 0);

  return marker;
}

export const INTER_FONT = '"Inter", sans-serif' as const;
export const SOURCE_SERIF_FONT = '"Source Serif 4", serif' as const;
export type FontFamily = typeof INTER_FONT | typeof SOURCE_SERIF_FONT | (string & {});
