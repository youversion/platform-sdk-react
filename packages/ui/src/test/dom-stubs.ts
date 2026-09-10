/** jsdom has no ResizeObserver; Radix / floating-ui need a constructor. */
export function installResizeObserverStub(): void {
  globalThis.ResizeObserver = class {
    observe(): void {
      return undefined;
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  };
}

export function requireHtmlButton(node: Element | null): HTMLButtonElement {
  if (!(node instanceof HTMLButtonElement)) {
    throw new Error('expected HTMLButtonElement');
  }
  return node;
}

export function requireHtmlElement(node: Element | null): HTMLElement {
  if (!(node instanceof HTMLElement)) {
    throw new Error('expected HTMLElement');
  }
  return node;
}

export function requireShadowRoot(container: ParentNode): ShadowRoot {
  const host = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
  if (!host?.shadowRoot) throw new Error('shadow root not attached');
  return host.shadowRoot;
}
