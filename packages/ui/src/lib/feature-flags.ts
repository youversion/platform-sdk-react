/**
 * Internal dark-launch flags for the UI package.
 *
 * NOT exported from the package entry point (`src/index.ts`) — these are
 * SDK-internal switches, not consumer API. Flip the default here when a
 * feature is ready to launch.
 */

/**
 * Dark-launch default for server-backed highlights in BibleReader (YPE-1034).
 * While `false`, the reader's highlight color row is inert: no highlight
 * fetches, no writes, nothing rendered from the API.
 */
export const HIGHLIGHTS_LIVE = false;

let highlightsLive = HIGHLIGHTS_LIVE;

/** Current state of the highlights dark-launch flag. */
export function isHighlightsLive(): boolean {
  return highlightsLive;
}

/**
 * Force the highlights flag on/off.
 *
 * @internal Test/Storybook-only. Never call from product code — launch by
 * changing {@link HIGHLIGHTS_LIVE} instead.
 */
export function setHighlightsLive(value: boolean): void {
  highlightsLive = value;
}
