import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../i18n';
import { INTER_FONT, UNTITLED_SERIF_FONT, type FontFamily } from '../lib/verse-html-utils';
import { BibleThemeSettingsContent } from './bible-reader';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { YvComponentStyles } from '../lib/yv-styles-components';

function ConstrainedSettings(): React.ReactNode {
  const [boundary, setBoundary] = useState<HTMLDivElement | null>(null);
  const [fontFamily, setFontFamily] = useState<FontFamily>(INTER_FONT);
  const [fontSize, setFontSize] = useState(16);
  return (
    <>
      <YvComponentStyles />
      <div
        ref={setBoundary}
        data-testid="settings-boundary"
        data-font-family={fontFamily}
        data-font-size={fontSize}
        style={{ position: 'relative', blockSize: 360, inlineSize: 800 }}
      >
        <div style={{ position: 'absolute', insetBlockStart: '53%', insetInlineStart: '50%' }}>
          <Popover>
            <PopoverTrigger data-testid="settings-trigger">Settings</PopoverTrigger>
            <PopoverContent heading="Reader settings" collisionBoundary={boundary} sideOffset={16}>
              <BibleThemeSettingsContent
                theme="light"
                fontFamily={fontFamily}
                fontSize={fontSize}
                lineSpacing={1.7}
                onFontSelected={setFontFamily}
                onFontIncreased={() => undefined}
                onFontDecreased={() => setFontSize((current) => current - 1)}
                onChangeLineSpacing={() => undefined}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </>
  );
}

function MixedLightAndShadowControls(): React.ReactNode {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div ref={setPortalContainer} data-testid="nested-portal-container" />
      <Popover>
        <PopoverTrigger data-testid="mixed-controls-trigger">Settings</PopoverTrigger>
        <PopoverContent
          heading="Reader settings"
          headerChild={<button data-testid="header-action">Header action</button>}
          onFocusOutside={(event) => event.preventDefault()}
        >
          <BibleThemeSettingsContent
            theme="light"
            fontFamily={INTER_FONT}
            fontSize={16}
            lineSpacing={1.7}
            onFontSelected={() => undefined}
            onFontIncreased={() => undefined}
            onFontDecreased={() => undefined}
            onChangeLineSpacing={() => undefined}
          />
          {portalContainer
            ? createPortal(
                <>
                  <button data-testid="portal-first">First portal action</button>
                  <button data-testid="portal-second">Second portal action</button>
                </>,
                portalContainer,
              )
            : null}
        </PopoverContent>
      </Popover>
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
    const controls = settings.getAllByRole('button');
    void expect(controls).toHaveLength(5);
    const decreaseFontSizeButton = settings.getByTestId('decrease-font-size');
    void expect(controls[0]).toBe(decreaseFontSizeButton);
    const serifButton = settings.getByRole('button', {
      name: `${i18n.t('fontLabel')} ${i18n.t('untitledSerifFontName')}`,
    });
    void expect(controls[controls.length - 1]).toBe(serifButton);
    const closeButton = within(dialog).getByRole('button', { name: i18n.t('closeAriaLabel') });
    void expect(ownerDocument.activeElement).toBe(closeButton);
    await userEvent.tab();
    void expect(settingsRoot.activeElement).toBe(decreaseFontSizeButton);
    await userEvent.keyboard('{Enter}');
    void expect(canvas.getByTestId('settings-boundary')).toHaveAttribute('data-font-size', '15');

    let focusedControlReceivedTab = false;
    decreaseFontSizeButton.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Tab') focusedControlReceivedTab = true;
      },
      { once: true },
    );
    for (const control of controls.slice(1)) {
      await userEvent.tab();
      void expect(settingsRoot.activeElement).toBe(control);
    }
    void expect(focusedControlReceivedTab).toBe(true);
    await userEvent.keyboard('{Enter}');
    void expect(canvas.getByTestId('settings-boundary')).toHaveAttribute(
      'data-font-family',
      UNTITLED_SERIF_FONT,
    );
    await userEvent.tab();
    void expect(ownerDocument.activeElement).toBe(closeButton);
    for (const control of [...controls].reverse()) {
      await userEvent.tab({ shift: true });
      void expect(settingsRoot.activeElement).toBe(control);
    }
    await userEvent.tab({ shift: true });
    void expect(ownerDocument.activeElement).toBe(closeButton);
    // Use the real settings body and Radix collision cap. Unlike a click helper,
    // hit testing can detect controls rendered but clipped below the panel.
    const settingsBody = serifButton.closest<HTMLElement>('[data-yv-sdk]');
    if (!settingsBody) throw new Error('settings body not rendered');
    const boundary = canvas.getByTestId('settings-boundary');
    const header = within(dialog).getByRole('heading');
    await Promise.all(dialog.getAnimations().map((animation) => animation.finished));
    await waitFor(() => {
      const panelRect = dialog.getBoundingClientRect();
      const boundaryRect = boundary.getBoundingClientRect();
      const availableHeight = Number.parseFloat(
        getComputedStyle(dialog).getPropertyValue('--radix-popover-content-available-height'),
      );
      void expect(availableHeight).toBeGreaterThan(0);
      void expect(Math.abs(panelRect.height - availableHeight)).toBeLessThanOrEqual(1);
      void expect(
        header.getBoundingClientRect().height + settingsBody.scrollHeight,
      ).toBeGreaterThan(availableHeight);
      void expect(panelRect.top).toBeGreaterThanOrEqual(boundaryRect.top);
      void expect(panelRect.bottom).toBeLessThanOrEqual(boundaryRect.bottom);
      void expect(panelRect.left).toBeGreaterThanOrEqual(boundaryRect.left);
      void expect(panelRect.right).toBeLessThanOrEqual(boundaryRect.right);
      void expect(settingsBody.scrollHeight).toBeGreaterThan(settingsBody.clientHeight);
      void expect(getComputedStyle(settingsBody).overflowY).toBe('auto');
    });
    const headerOffset = header.getBoundingClientRect().top - dialog.getBoundingClientRect().top;
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
    await userEvent.keyboard('{Escape}');
    await waitFor(() => void expect(dialog).not.toBeInTheDocument());
    void expect(ownerDocument.activeElement).toBe(canvas.getByTestId('settings-trigger'));
  },
};

export const MixedAndPortaledControlsPreserveTabOrder: Story = {
  render: () => <MixedLightAndShadowControls />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('mixed-controls-trigger'));
    const ownerDocument = canvasElement.ownerDocument;
    const dialog = await within(ownerDocument.body).findByRole('dialog');
    const headerAction = within(dialog).getByTestId('header-action');
    const closeButton = within(dialog).getByRole('button', { name: i18n.t('closeAriaLabel') });
    void expect(ownerDocument.activeElement).toBe(headerAction);
    await userEvent.tab();
    void expect(ownerDocument.activeElement).toBe(closeButton);

    const settingsHost = await waitFor(() => {
      const candidate = dialog.querySelector<HTMLElement>('[data-yv-shadow-host]');
      if (!candidate?.shadowRoot) throw new Error('settings shadow root not attached');
      return candidate;
    });
    const settingsScope = settingsHost.shadowRoot!.querySelector<HTMLElement>(
      '[data-yv-shadow-content-wrapper]',
    )!;
    const firstSetting = within(settingsScope).getByTestId('decrease-font-size');
    await userEvent.tab();
    void expect(settingsHost.shadowRoot!.activeElement).toBe(firstSetting);

    const firstPortalAction = canvas.getByTestId('portal-first');
    const secondPortalAction = canvas.getByTestId('portal-second');
    firstPortalAction.focus();
    void expect(ownerDocument.activeElement).toBe(firstPortalAction);
    await userEvent.tab();
    void expect(ownerDocument.activeElement).toBe(secondPortalAction);
    void expect(dialog).toBeInTheDocument();
  },
};
