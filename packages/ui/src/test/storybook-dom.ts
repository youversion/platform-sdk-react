import { requireShadowRoot } from './dom-stubs';

interface StorybookWaitOptions {
  timeout?: number;
}

export async function waitFor<T>(
  callback: () => T | Promise<T>,
  options: StorybookWaitOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? 5000;
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
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
