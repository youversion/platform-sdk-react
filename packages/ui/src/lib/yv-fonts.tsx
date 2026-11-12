import React, { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * Untitled Serif — font_id 1 / slug 'untitled-serif'.
 * See docs/adr/0004-adopt-untitled-serif-via-fonts-api.md.
 */
const UNTITLED_SERIF_FONT_ID = 1;
const GOOGLE_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';
const BASE_FONT_STYLE_HREF = 'yv-sdk-base-fonts';
const GOOGLE_FONTS_IMPORT = `@import url('${GOOGLE_FONTS_STYLESHEET}') layer(yv-sdk-fonts);`;

function ensureFontStylesheet(
  ownerDocument: Document,
  href: string,
  serverStyleHref?: string,
): void {
  const existing = Array.from(
    ownerDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).some((link) => link.getAttribute('href') === href);
  const serverStyle = serverStyleHref
    ? ownerDocument.head.querySelector(`style[data-href~="${serverStyleHref}"]`)
    : null;
  if (existing || serverStyle) return;

  const link = ownerDocument.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.yvFont = '';
  ownerDocument.head.append(link);
}

/** @internal Installs the base-font resource in a specific owning document. */
export function ensureBaseFonts(ownerDocument: Document): void {
  ensureFontStylesheet(ownerDocument, GOOGLE_FONTS_STYLESHEET, BASE_FONT_STYLE_HREF);
}

export interface YvFontsProps {
  /** Authorizes the optional Untitled Serif request; base fonts do not require it. */
  appKey?: string;
  /** Mirrors `ApiClient`'s `config.apiHost ?? 'api.youversion.com'` so staging keeps working. */
  apiHost?: string;
}

function ClientFontStylesheet({
  href,
  serverStyleHref,
}: {
  href: string;
  serverStyleHref?: string;
}): React.ReactElement | null {
  const [installedHref, setInstalledHref] = useState<string>();
  const install = useCallback(
    (probe: HTMLTemplateElement | null) => {
      if (probe) {
        ensureFontStylesheet(probe.ownerDocument, href, serverStyleHref);
        setInstalledHref(href);
      }
    },
    [href, serverStyleHref],
  );
  if (installedHref === href) return null;
  return <template ref={install} />;
}

function subscribeToHydration(): () => void {
  return () => undefined;
}

function FontStylesheet({
  href,
  serverStyle,
  serverStyleHref,
}: {
  href: string;
  serverStyle?: React.ReactElement;
  serverStyleHref?: string;
}): React.ReactElement | null {
  const serverOrHydrating = useSyncExternalStore(
    subscribeToHydration,
    () => false,
    () => true,
  );

  return serverOrHydrating ? (
    (serverStyle ?? <link rel="stylesheet" href={href} precedence="yv-sdk-fonts" />)
  ) : (
    <ClientFontStylesheet href={href} serverStyleHref={serverStyleHref} />
  );
}

/** Loads the public base fonts required by standalone and Provider-owned UI. */
export function YvBaseFonts(): React.ReactElement | null {
  return (
    <FontStylesheet
      href={GOOGLE_FONTS_STYLESHEET}
      serverStyleHref={BASE_FONT_STYLE_HREF}
      serverStyle={
        <style href={BASE_FONT_STYLE_HREF} precedence="yv-sdk-fonts">
          {GOOGLE_FONTS_IMPORT}
        </style>
      }
    />
  );
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
 * Server rendering and hydration use React resources so late Suspense segments
 * carry the gated dependency while the public base-font import stays
 * non-blocking. Fresh client mounts switch to an ordinary document-owned
 * stylesheet, deduped by `href`. The inert probe discovers the correct owner
 * document for same-origin iframes without creating React's stylesheet-
 * suspension promise.
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
