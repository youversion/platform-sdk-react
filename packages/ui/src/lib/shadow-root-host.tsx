import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tailwindStylesheet } from './embedded-styles';

const sdkStyleSheets = new WeakMap<Document, Map<string, CSSStyleSheet>>();
const SDK_SHADOW_STYLE_HREF = 'yv-sdk-shadow-styles';
const SDK_SHADOW_STYLE_PRECEDENCE = 'yv-sdk';

function getStyleSheetConstructor(root: ShadowRoot): typeof CSSStyleSheet | undefined {
  return root.ownerDocument.defaultView?.CSSStyleSheet;
}

function supportsAdoptedStyleSheets(root: ShadowRoot): boolean {
  const StyleSheet = getStyleSheetConstructor(root);
  return (
    StyleSheet !== undefined &&
    'replaceSync' in StyleSheet.prototype &&
    'adoptedStyleSheets' in root
  );
}

function getOrCreateSdkStyleSheet(root: ShadowRoot, cssText: string): CSSStyleSheet {
  const ownerDocument = root.ownerDocument;
  const existingByCss = sdkStyleSheets.get(ownerDocument);
  const existing = existingByCss?.get(cssText);
  if (existing) return existing;

  const StyleSheet = getStyleSheetConstructor(root)!;
  const sheet = new StyleSheet();
  sheet.replaceSync(cssText);
  const next = existingByCss ?? new Map<string, CSSStyleSheet>();
  next.set(cssText, sheet);
  sdkStyleSheets.set(ownerDocument, next);
  return sheet;
}

function resetHost(host: HTMLDivElement): void {
  // The host page can select this light-DOM element, including with !important.
  // Inline author-important declarations establish the smallest stable box.
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('display', 'contents', 'important');
  host.style.setProperty('writing-mode', 'inherit', 'important');
  host.style.setProperty('text-orientation', 'inherit', 'important');
}

export interface ShadowRootHostProps {
  children: ReactNode;
  /**
   * CSS adopted through the existing constructable-stylesheet path
   * (`replaceSync` + `adoptedStyleSheets`, or the `<style>` fallback).
   * Defaults to the Tailwind `__YV_STYLES__` bundle.
   */
  cssText?: string;
}

/** @internal Proof-of-concept primitive; not part of the public API. */
export function ShadowRootHost({
  children,
  cssText = tailwindStylesheet,
}: ShadowRootHostProps): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [needsStyleFallback, setNeedsStyleFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    // React StrictMode replays effects against the same DOM node. Inspect the
    // live node instead of captured state so attachShadow is called only once.
    if (!host || host.shadowRoot) return;

    resetHost(host);
    const root = host.attachShadow({ mode: 'open' });
    if (supportsAdoptedStyleSheets(root)) {
      root.adoptedStyleSheets = [getOrCreateSdkStyleSheet(root, cssText)];
    } else {
      setNeedsStyleFallback(true);
    }
    setShadowRoot(root);
  }, [cssText]);

  return (
    <div ref={hostRef} data-yv-shadow-host>
      {shadowRoot
        ? createPortal(
            <>
              {needsStyleFallback ? (
                <style href={SDK_SHADOW_STYLE_HREF} precedence={SDK_SHADOW_STYLE_PRECEDENCE}>
                  {cssText}
                </style>
              ) : null}
              {/* Host selectors cannot reach this reset boundary. */}
              <div style={{ all: 'initial', display: 'contents' }}>{children}</div>
            </>,
            shadowRoot,
          )
        : null}
    </div>
  );
}
