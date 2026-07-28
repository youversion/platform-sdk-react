/**
 * Dark-launch default for server-backed highlights in BibleReader (YPE-1034).
 * While `false`, the reader's highlight color row is inert: no fetches, no
 * writes, nothing rendered from the API. Flip here to launch.
 */
export const HIGHLIGHTS_LIVE = true;

let highlightsLive = HIGHLIGHTS_LIVE;

export const isHighlightsLive = (): boolean => highlightsLive;

/** @internal Test/Storybook only — launch by changing HIGHLIGHTS_LIVE. */
export const setHighlightsLive = (value: boolean): void => void (highlightsLive = value);
