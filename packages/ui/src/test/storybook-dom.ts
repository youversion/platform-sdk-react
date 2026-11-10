import { waitFor as storybookWaitFor } from 'storybook/test';
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

async function pressNativeBrowserKey(keys: string): Promise<boolean> {
  if (!('__vitest_worker__' in globalThis)) return false;
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
