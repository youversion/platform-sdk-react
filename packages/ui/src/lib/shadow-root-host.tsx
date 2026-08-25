import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

declare const __YV_STYLES__: string;

const sdkStyleSheets = new WeakMap<Document, CSSStyleSheet>();
const SDK_SHADOW_STYLE_HREF = 'yv-sdk-shadow-styles';
const SDK_SHADOW_STYLE_PRECEDENCE = 'yv-sdk';
type ShadowPortalStrategy = 'local-inline' | 'local-top-layer';

interface ShadowPortalController {
  container: HTMLElement | null;
  prepareOpen: (instanceId: string) => void;
  requestClose: (instanceId: string) => void;
}

const ShadowPortalContext = createContext<ShadowPortalController | null>(null);

/**
 * @internal Registers one floating-content owner and returns its portal target.
 * `undefined` means no local strategy is enabled; `null` means the lazy target
 * is being prepared; an element means the caller can portal into it.
 */
export function useShadowPortalTarget(open: boolean): HTMLElement | null | undefined {
  const controller = useContext(ShadowPortalContext);
  const instanceId = useId();
  const prepareOpen = controller?.prepareOpen;
  const requestClose = controller?.requestClose;

  useLayoutEffect(() => {
    if (!open || !prepareOpen || !requestClose) return;

    prepareOpen(instanceId);
    return () => requestClose(instanceId);
  }, [instanceId, open, prepareOpen, requestClose]);

  return controller?.container;
}

function getStyleSheetConstructor(root: ShadowRoot): typeof CSSStyleSheet | undefined {
  return root.ownerDocument.defaultView?.CSSStyleSheet;
}

function supportsAdoptedStyleSheets(root: ShadowRoot): boolean {
  const StyleSheet = getStyleSheetConstructor(root);
  if (!StyleSheet) return false;
  return 'replaceSync' in StyleSheet.prototype && 'adoptedStyleSheets' in root;
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

function hidePopoverIfOpen(container: HTMLElement | null): void {
  if (container?.hasAttribute('popover') && container.matches(':popover-open')) {
    container.hidePopover();
  }
}

interface ShadowRootHostProps {
  children: ReactNode;
  /** @internal Spike-only, mount-stable strategy; omit for leaves without overlays. */
  portalStrategy?: ShadowPortalStrategy;
}

/** @internal Proof-of-concept primitive; not part of the public API. */
export function ShadowRootHost({ children, portalStrategy }: ShadowRootHostProps): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const portalContainerRef = useRef<HTMLElement | null>(null);
  const portalObserverRef = useRef<MutationObserver | null>(null);
  const activePortalIdsRef = useRef(new Set<string>());
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [needsStyleFallback, setNeedsStyleFallback] = useState(false);

  const hideIfIdle = useCallback(
    (): void => {
      const container = portalContainerRef.current;
      if (
        portalStrategy !== 'local-top-layer' ||
        !container ||
        activePortalIdsRef.current.size > 0 ||
        container.childElementCount > 0
      ) {
        return;
      }

      hidePopoverIfOpen(container);
    },
    [portalStrategy],
  );

  const ensurePortalContainer = useCallback((): HTMLElement => {
    const existing = portalContainerRef.current;
    if (existing) return existing;

    const root = shadowRootRef.current;
    if (!root || !portalStrategy) {
      throw new Error('Shadow portal requested without an enabled component shadow root');
    }

    const container = root.ownerDocument.createElement('div');
    container.setAttribute(
      portalStrategy === 'local-top-layer'
        ? 'data-yv-shadow-local-overlay'
        : 'data-yv-shadow-inline-overlay',
      '',
    );
    let observer: MutationObserver | null = null;
    if (portalStrategy === 'local-top-layer') {
      if (!('showPopover' in container) || !('hidePopover' in container)) {
        throw new Error('The native Popover API is required for isolated floating content');
      }
      const MutationObserverConstructor = root.ownerDocument.defaultView?.MutationObserver;
      if (!MutationObserverConstructor) {
        throw new Error('MutationObserver is required for isolated floating content');
      }
      container.setAttribute('popover', 'manual');
      observer = new MutationObserverConstructor(hideIfIdle);
    }

    root.append(container);
    portalContainerRef.current = container;
    setPortalContainer(container);
    if (observer) {
      observer.observe(container, { childList: true });
      portalObserverRef.current = observer;
    }
    return container;
  }, [hideIfIdle, portalStrategy]);

  const prepareOpen = useCallback(
    (instanceId: string): void => {
      const container = ensurePortalContainer();
      activePortalIdsRef.current.add(instanceId);
      if (portalStrategy === 'local-top-layer' && !container.matches(':popover-open')) {
        container.showPopover();
      }
    },
    [ensurePortalContainer, portalStrategy],
  );

  const requestClose = useCallback(
    (instanceId: string): void => {
      activePortalIdsRef.current.delete(instanceId);
      hideIfIdle();
    },
    [hideIfIdle],
  );

  const portalController = useMemo<ShadowPortalController | null>(
    () =>
      portalStrategy
        ? { container: portalContainer, prepareOpen, requestClose }
        : null,
    [portalContainer, portalStrategy, prepareOpen, requestClose],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // React StrictMode replays effects against the same DOM node. Reuse the
    // live root so attachShadow is called only once.
    const existingRoot = host.shadowRoot;
    const root = existingRoot ?? host.attachShadow({ mode: 'open' });
    shadowRootRef.current = root;
    if (!existingRoot) {
      resetHost(host);
      if (supportsAdoptedStyleSheets(root)) {
        root.adoptedStyleSheets = [getOrCreateSdkStyleSheet(root)];
      } else {
        setNeedsStyleFallback(true);
      }
    }
    setShadowRoot(root);

    return () => {
      portalObserverRef.current?.disconnect();
      portalObserverRef.current = null;
      activePortalIdsRef.current.clear();
      const container = portalContainerRef.current;
      hidePopoverIfOpen(container);
      container?.remove();
      portalContainerRef.current = null;
    };
  }, []);

  return (
    <div ref={hostRef} data-yv-shadow-host>
      {shadowRoot
        ? createPortal(
            <ShadowPortalContext.Provider value={portalController}>
              {needsStyleFallback ? (
                <style href={SDK_SHADOW_STYLE_HREF} precedence={SDK_SHADOW_STYLE_PRECEDENCE}>
                  {__YV_STYLES__}
                </style>
              ) : null}
              {/* Host selectors cannot reach this reset boundary. */}
              <div style={{ all: 'initial', display: 'contents' }}>
                {children}
              </div>
            </ShadowPortalContext.Provider>,
            shadowRoot,
          )
        : null}
    </div>
  );
}
