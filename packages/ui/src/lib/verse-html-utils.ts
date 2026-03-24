export const INTER_FONT = '"Inter", sans-serif' as const;
export const SOURCE_SERIF_FONT = '"Source Serif 4", serif' as const;
export type FontFamily = typeof INTER_FONT | typeof SOURCE_SERIF_FONT | (string & {});
