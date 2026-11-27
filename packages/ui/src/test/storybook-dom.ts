import { userEvent as storybookUserEvent, waitFor as storybookWaitFor } from 'storybook/test';
import { requireShadowRoot } from './dom-stubs';

interface StorybookWaitOptions {
  timeout?: number;
}

export function waitFor<T>(
  callback: () => T | Promise<T>,
  options: StorybookWaitOptions = {},
): Promise<T> {
  return storybookWaitFor(callback, { timeout: 5000, ...options });
}

export async function waitForElement<ElementType extends Element>(
  container: ParentNode,
  selector: string,
  message: string,
  options?: StorybookWaitOptions,
): Promise<ElementType> {
  return waitFor(() => {
    const element = container.querySelector<ElementType>(selector);
    if (!element) throw new Error(message);
    return element;
  }, options);
}

export async function waitForShadowRoot(container: ParentNode): Promise<ShadowRoot> {
  return waitFor(() => requireShadowRoot(container));
}

export function requireShadowContent(root: ShadowRoot): HTMLElement {
  const content = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
  if (!content) throw new Error('shadow content wrapper not rendered');
  return content;
}

export function waitForShadowContent(root: ShadowRoot): Promise<HTMLElement> {
  return waitFor(() => requireShadowContent(root));
}

/** Resolve CSS colors to sRGB bytes across browser serialization formats. */
export function getColorChannels(color: string, ownerDocument: Document): number[] {
  const context = ownerDocument.createElement('canvas').getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable');
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data);
}

export function getBackgroundColorChannels(element: Element): number[] {
  return getColorChannels(getComputedStyle(element).backgroundColor, element.ownerDocument);
}

export async function clickStoryElement(element: Element): Promise<void> {
  if (__YV_STORYBOOK_VITEST__) {
    const { userEvent } = await import('vitest/browser');
    await userEvent.click(element);
    return;
  }
  await storybookUserEvent.click(element);
}

async function pressNativeBrowserKey(keys: string): Promise<boolean> {
  if (!__YV_STORYBOOK_VITEST__) return false;
  const { userEvent } = await import('vitest/browser');
  await userEvent.keyboard(keys);
  return true;
}

export async function verifyNativeBrowserKey(
  keys: string,
  verify: () => void | Promise<void>,
): Promise<boolean> {
  if (!(await pressNativeBrowserKey(keys))) return false;
  await verify();
  return true;
}
