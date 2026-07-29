import React from 'react';

/**
 * Untitled Serif — font_id 1 / slug 'untitled-serif'.
 * See docs/adr/0003-adopt-untitled-serif-via-fonts-api.md.
 */
const UNTITLED_SERIF_FONT_ID = 1;

export interface YvFontsProps {
  /** The consumer's app key. Without one there is nothing to authorize the request. */
  appKey?: string;
  /** Mirrors `ApiClient`'s `config.apiHost ?? 'api.youversion.com'` so staging keeps working. */
  apiHost?: string;
}

/**
 * Loads the YouVersion brand serif (Untitled Serif) from the Fonts API stylesheet
 * endpoint, which requires an app key.
 *
 * Sibling to `<YvStyles />` and the SDK's first runtime-value-dependent
 * stylesheet: the URL needs the app key, which is only known at render time, so
 * it cannot live in the build-time-frozen `__YV_STYLES__` blob.
 *
 * React 19 hoists `<link rel="stylesheet" precedence>` into `<head>` and dedupes
 * by `href`, so multiple providers still yield one link. `@font-face` is not
 * subject to `@layer`, so cascade position is irrelevant here — `precedence` is
 * only there to opt into the hoist + dedupe.
 *
 * Caveat: React also suspends the component that renders a `precedence` stylesheet
 * while the sheet loads. `yv-fonts.test.tsx` verifies that a plain synchronous
 * mount still commits its children; a mount inside a transition (a Next.js App
 * Router client navigation, say) is not covered by that test and may hold the
 * commit until the request settles. Errors settle too, so the worst case is added
 * latency, not a hang.
 */
export function YvFonts({
  appKey,
  apiHost = 'api.youversion.com',
}: YvFontsProps): React.ReactElement | null {
  if (!appKey?.trim()) return null;

  const href = `https://${apiHost}/v1/fonts/${UNTITLED_SERIF_FONT_ID}/stylesheet?app_key=${encodeURIComponent(appKey)}`;

  return <link rel="stylesheet" href={href} precedence="yv-sdk-fonts" />;
}
