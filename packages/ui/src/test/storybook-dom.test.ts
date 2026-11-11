import { expect, it, vi } from 'vitest';
import { verifyNativeBrowserKey } from './storybook-dom';

it('does not manufacture native keyboard behavior when browser input is unavailable', async () => {
  const before = document.createElement('button');
  const after = document.createElement('button');
  document.body.append(before, after);
  before.focus();
  const verify = vi.fn(() => after.focus());
  const pressed = await verifyNativeBrowserKey('{Tab}', verify);

  expect(pressed).toBe(false);
  expect(verify).not.toHaveBeenCalled();
  expect(before).toHaveFocus();
});
