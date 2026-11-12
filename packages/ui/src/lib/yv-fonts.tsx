import React, { useCallback, useState } from 'react';

/**
 * Untitled Serif — font_id 1 / slug 'untitled-serif'.
 * See docs/adr/0004-adopt-untitled-serif-via-fonts-api.md.
 */
const UNTITLED_SERIF_FONT_ID = 1;
const GOOGLE_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';

function ensureFontStylesheet(ownerDocument: Document, href: string): void {
  const existing = Array.from(
    ownerDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).some((link) => link.getAttribute('href') === href);
  if (existing) return;

  const link = ownerDocument.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.yvFont = '';
  ownerDocument.head.append(link);
}

/** @internal Installs the base-font resource in a specific owning document. */
export function ensureBaseFonts(ownerDocument: Document): void {
  ensureFontStylesheet(ownerDocument, GOOGLE_FONTS_STYLESHEET);
}

export interface YvFontsProps {
  /** Authorizes the optional Untitled Serif request; base fonts do not require it. */
  appKey?: string;
  /** Mirrors `ApiClient`'s `config.apiHost ?? 'api.youversion.com'` so staging keeps working. */
  apiHost?: string;
}

function FontStylesheet({ href }: { href: string }): React.ReactElement | null {
  const [installedHref, setInstalledHref] = useState<string>();
  const install = useCallback(
    (probe: HTMLTemplateElement | null) => {
      if (probe) {
        ensureFontStylesheet(probe.ownerDocument, href);
        setInstalledHref(href);
      }
    },
    [href],
  );
  if (installedHref === href) return null;
  return <template ref={install} />;
}

/** Loads the public base fonts required by standalone and Provider-owned UI. */
export function YvBaseFonts(): React.ReactElement | null {
  return <FontStylesheet href={GOOGLE_FONTS_STYLESHEET} />;
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
 * Each resource is installed as an ordinary document-owned stylesheet and
 * deduped by `href`. The inert probe discovers the correct owner document for
 * same-origin iframes without creating React's stylesheet-suspension promise.
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
      {brandFontHref ? <FontStylesheet href={brandFontHref} /> : null}
    </>
  );
}
