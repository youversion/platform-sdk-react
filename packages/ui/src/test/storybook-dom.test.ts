import { expect, it, vi } from 'vitest';
import { verifyNativeBrowserKey } from './storybook-dom';

it('does not manufacture native keyboard behavior when browser input is unavailable', async () => {
  const vitestWorker = Object.getOwnPropertyDescriptor(globalThis, '__vitest_worker__');
  Reflect.deleteProperty(globalThis, '__vitest_worker__');
  const before = document.createElement('button');
  const after = document.createElement('button');
  document.body.append(before, after);
  before.focus();
  const verify = vi.fn(() => after.focus());
  let pressed: boolean | undefined;

  try {
    pressed = await verifyNativeBrowserKey('{Tab}', verify);
  } finally {
    if (vitestWorker) Object.defineProperty(globalThis, '__vitest_worker__', vitestWorker);
  }

  expect(pressed).toBe(false);
  expect(verify).not.toHaveBeenCalled();
  expect(before).toHaveFocus();
});
