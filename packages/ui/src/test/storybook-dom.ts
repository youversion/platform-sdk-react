import { waitFor } from 'storybook/test';
import { requireShadowRoot } from './dom-stubs';

interface StorybookWaitOptions {
  timeout?: number;
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

export async function waitForShadowRoot(
  container: ParentNode,
  options?: StorybookWaitOptions,
): Promise<ShadowRoot> {
  return waitFor(() => requireShadowRoot(container), options);
}
