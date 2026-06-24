// YouVersion brand fonts (loaded via @font-face in global.css, served from the prod CDN).
// Inter / Source Serif 4 are kept as graceful fallbacks within each stack.
export const AKTIV_FONT = '"Aktiv Grotesk App", "Inter", sans-serif' as const;
export const UNTITLED_SERIF_FONT = '"Untitled Serif", "Source Serif 4", serif' as const;
// Retained for backwards compatibility / explicit non-brand selections.
export const INTER_FONT = '"Inter", sans-serif' as const;
export const SOURCE_SERIF_FONT = '"Source Serif 4", serif' as const;
export type FontFamily =
  | typeof AKTIV_FONT
  | typeof UNTITLED_SERIF_FONT
  | typeof INTER_FONT
  | typeof SOURCE_SERIF_FONT
  | (string & {});
