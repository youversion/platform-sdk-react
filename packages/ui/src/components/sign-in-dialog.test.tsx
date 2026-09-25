import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SignInDialog } from './sign-in-dialog';

it('labels the sign-in prompt and routes each choice to its own callback', () => {
  const onConfirm = vi.fn();
  const onDecline = vi.fn();
  render(
    <SignInDialog
      open
      onOpenChange={vi.fn()}
      appName="Acme Bible"
      onConfirm={onConfirm}
      onDecline={onDecline}
    />,
  );

  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAccessibleName('INTRODUCING');
  expect(dialog).toHaveAccessibleDescription(/wants to connect to your YouVersion Bible App/);

  fireEvent.click(screen.getByRole('button', { name: 'Yes Please' }));
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onDecline).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'No Thanks' }));
  expect(onDecline).toHaveBeenCalledOnce();
  expect(onConfirm).toHaveBeenCalledOnce();
});
