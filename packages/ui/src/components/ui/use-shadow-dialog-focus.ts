import * as React from 'react';
import { tabbable } from 'tabbable';

import {
  getOwnShadowRoot,
  isElementFromOwnerDocument,
  useShadowModalPresence,
} from '@/lib/shadow-root-host';

interface ShadowDialogFocusOptions {
  container: HTMLElement | null | undefined;
  content: HTMLElement | null;
  modal: boolean;
  open: boolean;
  overlay: HTMLElement | null;
}

interface ShadowDialogFocus {
  onCloseAutoFocus: (event: Event) => void;
}

function useShadowDialogFocusContainment(
  active: boolean,
  content: HTMLElement | null,
  overlay: HTMLElement | null,
): void {
  const lastFocusedElementRef = React.useRef<Element | null>(null);
  const hadContentRef = React.useRef(false);

  React.useLayoutEffect(() => {
    const hadContent = hadContentRef.current;
    if (!active) {
      hadContentRef.current = false;
      return;
    }
    if (content) hadContentRef.current = true;

    const containmentTarget = content ?? overlay;
    if (!containmentTarget || !getOwnShadowRoot(containmentTarget)) return;

    if (!content && hadContent) containmentTarget.focus();

    const redirectFocus = (): void => {
      const remembered = lastFocusedElementRef.current;
      if (
        content &&
        isElementFromOwnerDocument(remembered, content, 'HTMLElement') &&
        remembered.isConnected &&
        content.contains(remembered)
      ) {
        remembered.focus();
        return;
      }

      containmentTarget.focus();
    };

    const handleFocusIn = (event: FocusEvent): void => {
      const [realTarget] = event.composedPath();
      if (!isElementFromOwnerDocument(realTarget, containmentTarget, 'Element')) return;

      if (content?.contains(realTarget)) {
        lastFocusedElementRef.current = realTarget;
        return;
      }
      if (!content && realTarget === overlay) return;

      redirectFocus();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || event.defaultPrevented || !content) return;

      const candidates = tabbable(content, { getShadowRoot: true });
      if (candidates.length === 0) {
        event.preventDefault();
        content.focus();
        return;
      }

      const [realTarget] = event.composedPath();
      const currentIndex = candidates.findIndex((candidate) => candidate === realTarget);
      let nextIndex = 0;
      if (event.shiftKey) {
        nextIndex = currentIndex <= 0 ? candidates.length - 1 : currentIndex - 1;
      } else if (currentIndex !== -1 && currentIndex !== candidates.length - 1) {
        nextIndex = currentIndex + 1;
      }

      event.preventDefault();
      candidates[nextIndex]?.focus();
    };

    const ownerDocument = containmentTarget.ownerDocument;
    ownerDocument.addEventListener('focusin', handleFocusIn);
    content?.addEventListener('keydown', handleKeyDown);
    return () => {
      ownerDocument.removeEventListener('focusin', handleFocusIn);
      content?.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, content, overlay]);
}

/** @internal Owns the Shadow DOM-specific modal focus lifecycle for Dialog. */
export function useShadowDialogFocus({
  container,
  content,
  modal,
  open,
  overlay,
}: ShadowDialogFocusOptions): ShadowDialogFocus {
  const modalPresent = modal && (overlay !== null || content !== null);
  useShadowDialogFocusContainment(modalPresent, content, overlay);
  const restoreFocusWhenModalReleased = useShadowModalPresence(modalPresent);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const capturedRestoreFocusRef = React.useRef(false);

  React.useLayoutEffect(() => {
    if (!open) {
      capturedRestoreFocusRef.current = false;
      return;
    }
    if (!container || capturedRestoreFocusRef.current) return;

    const shadowRoot = getOwnShadowRoot(container);
    const activeElement = shadowRoot
      ? (shadowRoot.activeElement ?? container.ownerDocument.activeElement)
      : container.ownerDocument.activeElement;
    if (isElementFromOwnerDocument(activeElement, container, 'HTMLElement')) {
      restoreFocusRef.current = activeElement;
    }
    capturedRestoreFocusRef.current = true;
  }, [container, open]);

  const onCloseAutoFocus = React.useCallback(
    (event: Event): void => {
      if (event.defaultPrevented || container === undefined) return;

      event.preventDefault();
      const restoreFocusTo = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreFocusTo && restoreFocusWhenModalReleased) {
        restoreFocusWhenModalReleased(restoreFocusTo);
      }
    },
    [container, restoreFocusWhenModalReleased],
  );

  return { onCloseAutoFocus };
}
