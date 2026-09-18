import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../i18n';
import { INTER_FONT, UNTITLED_SERIF_FONT, type FontFamily } from '../lib/verse-html-utils';
import { BibleThemeSettingsContent } from './bible-reader';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

function ConstrainedSettings(): React.ReactNode {
  const [boundary, setBoundary] = useState<HTMLDivElement | null>(null);
  const [fontFamily, setFontFamily] = useState<FontFamily>(INTER_FONT);
  return (
    <div
      ref={setBoundary}
      data-testid="settings-boundary"
      data-font-family={fontFamily}
      style={{ position: 'relative', blockSize: 360, inlineSize: 800 }}
    >
      <div style={{ position: 'absolute', insetBlockStart: '53%', insetInlineStart: '50%' }}>
        <Popover>
          <PopoverTrigger data-testid="settings-trigger">Settings</PopoverTrigger>
          <PopoverContent heading="Reader settings" collisionBoundary={boundary} sideOffset={16}>
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
  );
}

const meta = {
  title: 'Components/BibleReader/Settings',
  component: ConstrainedSettings,
  tags: ['integration'],
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
    const serifButton = within(dialog).getByRole('button', {
      name: `${i18n.t('fontLabel')} ${i18n.t('untitledSerifFontName')}`,
    });
    // Use the real settings body and Radix collision cap. Unlike a click helper,
    // hit testing can detect controls rendered but clipped below the panel.
    const settingsBody = serifButton.closest<HTMLElement>('[data-yv-sdk]');
    if (!settingsBody) throw new Error('settings body not rendered');
    await waitFor(() => {
      void expect(settingsBody.scrollHeight).toBeGreaterThan(settingsBody.clientHeight);
    });
    await Promise.all(dialog.getAnimations().map((animation) => animation.finished));
    const header = within(dialog).getByRole('heading');
    const headerTop = header.getBoundingClientRect().top;
    settingsBody.scrollTop = settingsBody.scrollHeight;
    await waitFor(() => {
      void expect(settingsBody.scrollTop).toBeGreaterThan(0);
      const buttonRect = serifButton.getBoundingClientRect();
      const bodyRect = settingsBody.getBoundingClientRect();
      void expect(buttonRect.top).toBeGreaterThanOrEqual(bodyRect.top);
      void expect(buttonRect.bottom).toBeLessThanOrEqual(bodyRect.bottom);
      const hit = ownerDocument.elementFromPoint(
        buttonRect.left + buttonRect.width / 2,
        buttonRect.top + buttonRect.height / 2,
      );
      void expect(serifButton.contains(hit)).toBe(true);
      void expect(header.getBoundingClientRect().top).toBe(headerTop);
    });
    await userEvent.click(serifButton);
    void expect(canvas.getByTestId('settings-boundary')).toHaveAttribute(
      'data-font-family',
      UNTITLED_SERIF_FONT,
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => void expect(dialog).not.toBeInTheDocument());
    void expect(ownerDocument.activeElement).toBe(canvas.getByTestId('settings-trigger'));
  },
};
