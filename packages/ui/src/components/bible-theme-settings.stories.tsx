import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../i18n';
import { INTER_FONT, UNTITLED_SERIF_FONT, type FontFamily } from '../lib/verse-html-utils';
import { BibleThemeSettingsContent } from './bible-reader';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { YvComponentStyles } from '../lib/yv-styles-components';

function ConstrainedSettings(): React.ReactNode {
  const [boundary, setBoundary] = useState<HTMLDivElement | null>(null);
  const [fontFamily, setFontFamily] = useState<FontFamily>(INTER_FONT);
  return (
    <>
      <YvComponentStyles />
      <div
        ref={setBoundary}
        data-testid="settings-boundary"
        data-font-family={fontFamily}
        style={{ position: 'relative', blockSize: 360, inlineSize: 800 }}
      >
        <div style={{ position: 'absolute', insetBlockStart: '75%', insetInlineStart: '50%' }}>
          <Popover>
            <PopoverTrigger data-testid="settings-trigger">Settings</PopoverTrigger>
            <PopoverContent
              heading="Reader settings"
              collisionBoundary={boundary}
              sideOffset={16}
              style={{ blockSize: 180 }}
            >
              <BibleThemeSettingsContent
                theme="light"
                fontFamily={fontFamily}
                fontSize={16}
                lineSpacing={1.7}
                onFontSelected={setFontFamily}
                onFontIncreased={() => undefined}
                onFontDecreased={() => undefined}
                onChangeLineSpacing={() => undefined}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
}

const meta = {
  title: 'Components/BibleReader/Settings',
  component: ConstrainedSettings,
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta<typeof ConstrainedSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FontControlsRemainReachableInConstrainedSpace: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('settings-trigger'));
    const ownerDocument = canvasElement.ownerDocument;
    const dialog = await within(ownerDocument.body).findByRole('dialog');
    const settingsHost = await waitFor(() => {
      const candidate = dialog.querySelector<HTMLElement>('[data-yv-shadow-host]');
      if (!candidate?.shadowRoot) throw new Error('settings shadow root not attached');
      return candidate;
    });
    const settingsRoot = settingsHost.shadowRoot!;
    const settingsScope = settingsRoot.querySelector<HTMLElement>(
      '[data-yv-shadow-content-wrapper]',
    )!;
    const settings = within(settingsScope);
    const serifButton = settings.getByRole('button', {
      name: `${i18n.t('fontLabel')} ${i18n.t('untitledSerifFontName')}`,
    });
    // Use the real settings body and Radix collision cap. Unlike a click helper,
    // hit testing can detect controls rendered but clipped below the panel.
    const settingsBody = serifButton.closest<HTMLElement>('[data-yv-sdk]');
    if (!settingsBody) throw new Error('settings body not rendered');
    const boundary = canvas.getByTestId('settings-boundary');
    await Promise.all(dialog.getAnimations().map((animation) => animation.finished));
    await waitFor(() => {
      const panelRect = dialog.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();
      void expect(panelRect.top).toBeGreaterThanOrEqual(boundaryRect.top);
      void expect(panelRect.bottom).toBeLessThanOrEqual(boundaryRect.bottom);
      void expect(panelRect.left).toBeGreaterThanOrEqual(boundaryRect.left);
      void expect(panelRect.right).toBeLessThanOrEqual(boundaryRect.right);
      void expect(settingsBody.scrollHeight).toBeGreaterThan(settingsBody.clientHeight);
      void expect(getComputedStyle(settingsBody).overflowY).toBe('auto');
    });
    const header = within(dialog).getByRole('heading');
    const headerOffset = header.getBoundingClientRect().top - dialog.getBoundingClientRect().top;
    const controls = settings.getAllByRole('button');
    void expect(controls).toHaveLength(5);
    for (const control of controls) {
      control.scrollIntoView({ block: 'center' });
      await waitFor(() => {
        const controlRect = control.getBoundingClientRect();
        const bodyRect = settingsBody.getBoundingClientRect();
        void expect(controlRect.top).toBeGreaterThanOrEqual(bodyRect.top);
        void expect(controlRect.bottom).toBeLessThanOrEqual(bodyRect.bottom);
        const hit = settingsRoot.elementFromPoint(
          controlRect.left + controlRect.width / 2,
          controlRect.top + controlRect.height / 2,
        );
        void expect(control.contains(hit)).toBe(true);
        const currentHeaderOffset =
          header.getBoundingClientRect().top - dialog.getBoundingClientRect().top;
        void expect(Math.abs(currentHeaderOffset - headerOffset)).toBeLessThanOrEqual(1);
      });
    }
    void expect(settingsBody.scrollTop).toBeGreaterThan(0);
    serifButton.focus();
    await userEvent.keyboard('{Enter}');
    void expect(canvas.getByTestId('settings-boundary')).toHaveAttribute(
      'data-font-family',
      UNTITLED_SERIF_FONT,
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => void expect(dialog).not.toBeInTheDocument());
    void expect(ownerDocument.activeElement).toBe(canvas.getByTestId('settings-trigger'));
  },
};
