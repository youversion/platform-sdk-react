import React from 'react';

/**
 * Untitled Serif — font_id 1 / slug 'untitled-serif'.
 * See docs/adr/0004-adopt-untitled-serif-via-fonts-api.md.
 */
const UNTITLED_SERIF_FONT_ID = 1;
const GOOGLE_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';

/** @internal Installs the base-font resource in a specific owning document. */
export function ensureBaseFonts(ownerDocument: Document): void {
  const existing = Array.from(
    ownerDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).some((link) => link.getAttribute('href') === GOOGLE_FONTS_STYLESHEET);
  if (existing) return;

  const link = ownerDocument.createElement('link');
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_STYLESHEET;
  link.dataset.precedence = 'yv-sdk-fonts';
  ownerDocument.head.append(link);
}

export interface YvFontsProps {
  /** Authorizes the optional Untitled Serif request; base fonts do not require it. */
  appKey?: string;
  /** Mirrors `ApiClient`'s `config.apiHost ?? 'api.youversion.com'` so staging keeps working. */
  apiHost?: string;
}

/** Loads the public base fonts required by standalone and Provider-owned UI. */
export function YvBaseFonts(): React.ReactElement {
  return <link rel="stylesheet" href={GOOGLE_FONTS_STYLESHEET} precedence="yv-sdk-fonts" />;
}

/**
 * Loads the SDK's document-owned fonts. Inter and Source Serif 4 come from the
 * public Google Fonts stylesheet; Untitled Serif comes from the gated Fonts API
 * stylesheet when an app key is available.
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
}: YvFontsProps): React.ReactElement {
  const brandFontHref = appKey?.trim()
    ? `https://${apiHost}/v1/fonts/${UNTITLED_SERIF_FONT_ID}/stylesheet?app_key=${encodeURIComponent(appKey)}`
    : undefined;

  return (
    <>
      <YvBaseFonts />
      {brandFontHref ? (
        <link rel="stylesheet" href={brandFontHref} precedence="yv-sdk-fonts" />
      ) : null}
    </>
  );
}
