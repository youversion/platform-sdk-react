export const INTER_FONT = '"Inter", sans-serif' as const;
export const UNTITLED_SERIF_FONT = '"Untitled Serif", "Source Serif 4", serif' as const;
/** @deprecated retained for the localStorage migration; not offered in the picker */
export const SOURCE_SERIF_FONT = '"Source Serif 4", serif' as const;
export type FontFamily =
  | typeof INTER_FONT
  | typeof UNTITLED_SERIF_FONT
  | typeof SOURCE_SERIF_FONT
  | (string & {});
