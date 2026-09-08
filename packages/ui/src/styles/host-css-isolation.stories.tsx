import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Hostile unlayered host CSS — Tailwind v3 preflight + a partner `button {}`.
 * Cascade 5 treats this as the last layer, so layered `yv-sdk-*` loses without
 * the A2 revert-layer rule.
 */
const HOSTILE_HOST_CSS = `
  body {
    font-family: "HostileHostSerif", cursive;
    color: rgb(255, 0, 128);
  }
  button {
    padding: 0;
    background: transparent;
    background-color: transparent;
    font: 20px "HostileHostSerif", cursive;
    color: rgb(255, 0, 128);
  }
  a {
    color: rgb(0, 255, 0);
    text-decoration: underline;
    font-family: "HostileHostSerif", cursive;
  }
  p {
    margin: 40px;
    padding: 20px;
    font-size: 24px;
    color: rgb(255, 0, 128);
    font-family: "HostileHostSerif", cursive;
  }
  h1 {
    font-size: 48px;
    font-weight: 900;
    margin: 40px;
    color: rgb(255, 0, 128);
    font-family: "HostileHostSerif", cursive;
  }
  input {
    padding: 0;
    background: rgb(255, 255, 0);
    background-color: rgb(255, 255, 0);
    font: 20px "HostileHostSerif", cursive;
    color: rgb(255, 0, 128);
  }
`;

function requiredElement(root: ParentNode, testId: string): HTMLElement {
  const node = root.querySelector(`[data-testid="${testId}"]`);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`missing [data-testid="${testId}"]`);
  }
  return node;
}

function HostCssIsolationFixture(): ReactElement {
  return (
    <>
      <style>{HOSTILE_HOST_CSS}</style>
      <button type="button" data-testid="host-button">
        Host
      </button>
      <div data-yv-sdk data-yv-theme="light" className="yv:text-foreground yv:bg-background">
        <Button data-testid="sdk-button">SDK</Button>
        <a href="#ref" data-testid="sdk-link" className="yv:text-primary">
          Link
        </a>
        <p data-testid="sdk-paragraph" className="yv:m-0 yv:text-sm">
          Paragraph
        </p>
        <h1 data-testid="sdk-heading" className="yv:m-0 yv:text-2xl yv:font-semibold">
          Heading
        </h1>
        <Input data-testid="sdk-input" aria-label="SDK input" />
      </div>
    </>
  );
}

const meta = {
  title: 'Styles/Host CSS isolation (A2)',
  component: HostCssIsolationFixture,
  parameters: {
    layout: 'padded',
    includeAuth: false,
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HostCssIsolationFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HostileHost: Story = {
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      const hostButton = requiredElement(document, 'host-button');
      const hostStyle = getComputedStyle(hostButton);
      await expect(hostStyle.paddingTop).toBe('0px');
      await expect(hostStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await expect(hostStyle.color).toBe('rgb(255, 0, 128)');
      await expect(hostStyle.fontFamily).toContain('HostileHostSerif');
    });

    const button = requiredElement(canvasElement, 'sdk-button');
    const link = requiredElement(canvasElement, 'sdk-link');
    const paragraph = requiredElement(canvasElement, 'sdk-paragraph');
    const heading = requiredElement(canvasElement, 'sdk-heading');
    const input = requiredElement(canvasElement, 'sdk-input');

    const buttonStyle = getComputedStyle(button);
    await expect(buttonStyle.paddingTop).toBe('8px');
    await expect(buttonStyle.paddingRight).toBe('16px');
    await expect(buttonStyle.paddingBottom).toBe('8px');
    await expect(buttonStyle.paddingLeft).toBe('16px');
    await expect(buttonStyle.backgroundColor).toBe('rgb(18, 18, 18)');
    await expect(buttonStyle.color).toBe('rgb(255, 255, 255)');
    await expect(buttonStyle.fontFamily).not.toContain('HostileHostSerif');
    await expect(buttonStyle.fontFamily).toMatch(/Inter/i);

    const linkStyle = getComputedStyle(link);
    await expect(linkStyle.color).toBe('rgb(18, 18, 18)');
    await expect(linkStyle.color).not.toBe('rgb(0, 255, 0)');
    await expect(linkStyle.textDecorationLine).not.toBe('underline');
    await expect(linkStyle.fontFamily).not.toContain('HostileHostSerif');

    const paragraphStyle = getComputedStyle(paragraph);
    await expect(paragraphStyle.marginTop).toBe('0px');
    await expect(paragraphStyle.paddingTop).toBe('0px');
    await expect(paragraphStyle.fontSize).toBe('14px');
    await expect(paragraphStyle.color).toBe('rgb(18, 18, 18)');
    await expect(paragraphStyle.fontFamily).not.toContain('HostileHostSerif');

    const headingStyle = getComputedStyle(heading);
    await expect(headingStyle.marginTop).toBe('0px');
    await expect(headingStyle.fontSize).toBe('24px');
    await expect(headingStyle.fontWeight).toBe('600');
    await expect(headingStyle.color).toBe('rgb(18, 18, 18)');
    await expect(headingStyle.fontFamily).not.toContain('HostileHostSerif');

    const inputStyle = getComputedStyle(input);
    await expect(inputStyle.paddingTop).toBe('4px');
    await expect(inputStyle.paddingRight).toBe('12px');
    await expect(inputStyle.paddingBottom).toBe('4px');
    await expect(inputStyle.paddingLeft).toBe('12px');
    await expect(inputStyle.backgroundColor).not.toBe('rgb(255, 255, 0)');
    await expect(inputStyle.color).not.toBe('rgb(255, 0, 128)');
    await expect(inputStyle.fontFamily).not.toContain('HostileHostSerif');
  },
};
