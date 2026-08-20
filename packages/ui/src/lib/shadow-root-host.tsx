import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

declare const __YV_STYLES__: string;

const sdkStyleSheets = new WeakMap<Document, CSSStyleSheet>();
const sdkOverlayRoots = new WeakMap<Document, ShadowRoot>();
const SDK_SHADOW_STYLE_HREF = 'yv-sdk-shadow-styles';
const SDK_SHADOW_STYLE_PRECEDENCE = 'yv-sdk';
const ShadowPortalContext = createContext<ShadowRoot | null>(null);

/** @internal Returns the active SDK shadow root for nested portal primitives. */
export function useShadowPortalContainer(): ShadowRoot | null {
  return useContext(ShadowPortalContext);
}

function getStyleSheetConstructor(root: ShadowRoot): typeof CSSStyleSheet | undefined {
  return root.ownerDocument.defaultView?.CSSStyleSheet;
}

function supportsAdoptedStyleSheets(root: ShadowRoot): boolean {
  const StyleSheet = getStyleSheetConstructor(root);
  return (
    StyleSheet !== undefined &&
    typeof StyleSheet.prototype.replaceSync === 'function' &&
    'adoptedStyleSheets' in root
  );
}

function getOrCreateSdkStyleSheet(root: ShadowRoot): CSSStyleSheet {
  const ownerDocument = root.ownerDocument;
  const existing = sdkStyleSheets.get(ownerDocument);
  if (existing) return existing;

  const StyleSheet = getStyleSheetConstructor(root)!;
  const sheet = new StyleSheet();
  sheet.replaceSync(__YV_STYLES__);
  sdkStyleSheets.set(ownerDocument, sheet);
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

function getOrCreateSdkOverlayRoot(ownerDocument: Document): ShadowRoot {
  const existing = sdkOverlayRoots.get(ownerDocument);
  if (existing?.host.isConnected) return existing;

  const host = ownerDocument.createElement('div');
  host.setAttribute('data-yv-shadow-overlay-host', '');
  resetHost(host);

  const root = host.attachShadow({ mode: 'open' });
  if (supportsAdoptedStyleSheets(root)) {
    root.adoptedStyleSheets = [getOrCreateSdkStyleSheet(root)];
  } else {
    const style = ownerDocument.createElement('style');
    style.textContent = __YV_STYLES__;
    root.append(style);
  }

  ownerDocument.body.append(host);
  sdkOverlayRoots.set(ownerDocument, root);
  return root;
}

interface ShadowRootHostProps {
  children: ReactNode;
}

/** @internal Proof-of-concept primitive; not part of the public API. */
export function ShadowRootHost({ children }: ShadowRootHostProps): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [portalContainer, setPortalContainer] = useState<ShadowRoot | null>(null);
  const [needsStyleFallback, setNeedsStyleFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    // React StrictMode replays effects against the same DOM node. Inspect the
    // live node instead of captured state so attachShadow is called only once.
    if (!host || host.shadowRoot) return;

    resetHost(host);
    const root = host.attachShadow({ mode: 'open' });
    if (supportsAdoptedStyleSheets(root)) {
      root.adoptedStyleSheets = [getOrCreateSdkStyleSheet(root)];
    } else {
      setNeedsStyleFallback(true);
    }
    setPortalContainer(getOrCreateSdkOverlayRoot(root.ownerDocument));
    setShadowRoot(root);
  }, []);

  return (
    <div ref={hostRef} data-yv-shadow-host>
      {shadowRoot
        ? createPortal(
            <ShadowPortalContext.Provider value={portalContainer}>
              {needsStyleFallback ? (
                <style href={SDK_SHADOW_STYLE_HREF} precedence={SDK_SHADOW_STYLE_PRECEDENCE}>
                  {__YV_STYLES__}
                </style>
              ) : null}
              {/* Host selectors cannot reach this reset boundary. */}
              <div style={{ all: 'initial', display: 'contents' }}>{children}</div>
            </ShadowPortalContext.Provider>,
            shadowRoot,
          )
        : null}
    </div>
  );
}
