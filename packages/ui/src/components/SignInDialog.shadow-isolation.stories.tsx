import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { globalHandlers } from '../test/mocks/handlers';
import { SignInDialog } from './sign-in-dialog';

const meta = {
  title: 'Spikes/SignInDialog Shadow DOM isolation',
  component: SignInDialog,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        ...globalHandlers,
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
  args: {
    open: true,
    onOpenChange: fn(),
    appName: 'Example Bible App',
    onConfirm: fn(),
    onDecline: fn(),
  },
  render: (args) => (
    <ShadowRootHost>
      <SignInDialog {...args} />
    </ShadowRootHost>
  ),
} satisfies Meta<typeof SignInDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UsesSharedOverlayWithFocusAndAccessibleReferences: Story = {
  play: async ({ canvasElement }) => {
    const overlayRoot = await waitFor(() => {
      const root = canvasElement.ownerDocument.body.querySelector<HTMLElement>(
        '[data-yv-shadow-overlay-host]',
      )?.shadowRoot;
      if (!root) throw new Error('shared overlay shadow root not attached');
      return root;
    });
    const dialog = await waitFor(() => {
      const element = overlayRoot.querySelector<HTMLElement>('[role="dialog"]');
      if (!element) throw new Error('sign-in dialog not rendered in shared overlay');
      return element;
    });

    void expect(dialog.getRootNode()).toBe(overlayRoot);
    void expect(
      canvasElement.ownerDocument.body.querySelector(':scope > [role="dialog"]'),
    ).toBeNull();

    const titleId = dialog.getAttribute('aria-labelledby');
    const descriptionId = dialog.getAttribute('aria-describedby');
    void expect(titleId).toBeTruthy();
    void expect(descriptionId).toBeTruthy();
    void expect(overlayRoot.getElementById(titleId!)).not.toBeNull();
    void expect(overlayRoot.getElementById(descriptionId!)).not.toBeNull();

    await waitFor(() => {
      const focusedElement = overlayRoot.activeElement;
      void expect(focusedElement !== null && dialog.contains(focusedElement)).toBe(true);
    });
  },
};
