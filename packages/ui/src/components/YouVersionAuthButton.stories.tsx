import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { expect, fn, userEvent, waitFor, spyOn } from 'storybook/test';
import { YouVersionAuthButton } from './YouVersionAuthButton';

// Store mock reference for interaction test
let signInMock: ReturnType<typeof fn>;

const meta = {
  title: 'Components/YouVersionAuthButton',
  component: YouVersionAuthButton,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
  tags: ['autodocs'],
  async beforeEach() {
    // Mock the signIn function to prevent redirect
    const { YouVersionAPIUsers } = await import('@youversion/platform-core');
    signInMock = fn().mockImplementation(async () => {
      // Simulate a delay of 1000ms before returning the result
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      return {
        accessToken: 'mock-token',
        errorMsg: null,
        yvpUserId: 'mock-user-id',
      };
    });

    spyOn(YouVersionAPIUsers, 'signIn')
      .mockImplementation(signInMock)
      .mockName('YouVersionAPIUsers.signIn');
  },
  args: {
    onAuthError: fn(),
    mode: 'auto',
  },
  argTypes: {
    onAuthError: {
      table: {
        disable: true,
      },
    },
    scopes: {
      table: {
        disable: true,
      },
    },
    background: {
      table: { disable: true },
    },
    mode: {
      control: { type: 'select' },
      options: ['signIn', 'signOut', 'auto'],
    },
    radius: {
      control: { type: 'select' },
      options: ['rounded', 'rectangular'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'short', 'icon'],
    },
    text: {
      control: { type: 'text' },
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'outline'],
    },
  },
} satisfies Meta<typeof YouVersionAuthButton>;

export default meta;

type Story = StoryObj<typeof meta>;

async function findAuthButton(
  canvasElement: HTMLElement,
  name: RegExp,
): Promise<HTMLButtonElement> {
  return waitFor(() => {
    const host = canvasElement.querySelector<HTMLElement>('[data-yv-shadow-host]');
    const button = Array.from(host?.shadowRoot?.querySelectorAll('button') ?? []).find(
      (candidate) => name.test(candidate.textContent ?? ''),
    );
    if (!button) throw new Error(`auth button matching ${name} not found`);
    return button;
  });
}

export const Default: Story = {};

export const LightOutline: Story = {
  args: {
    variant: 'outline',
  },
};

export const LightShort: Story = {
  args: {
    size: 'short',
  },
};

export const LightShortOutline: Story = {
  args: {
    size: 'short',
    variant: 'outline',
  },
};

export const LightIcon: Story = {
  args: {
    size: 'icon',
  },
};

export const LightIconOutline: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
  },
};

export const LightRectangle: Story = {
  args: {
    radius: 'rectangular',
  },
};

export const LightRectangleOutline: Story = {
  args: {
    radius: 'rectangular',
    variant: 'outline',
  },
};

export const LightRectangleShort: Story = {
  args: {
    radius: 'rectangular',
    size: 'short',
  },
};

export const LightRectangleShortOutline: Story = {
  args: {
    radius: 'rectangular',
    size: 'short',
    variant: 'outline',
  },
};

export const LightRectangleIcon: Story = {
  args: {
    radius: 'rectangular',
    size: 'icon',
  },
};

export const LightRectangleIconOutline: Story = {
  args: {
    radius: 'rectangular',
    size: 'icon',
    variant: 'outline',
  },
};

export const Dark: Story = {
  globals: {
    theme: 'dark',
  },
};

export const DarkOutline: Story = {
  args: {
    variant: 'outline',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkShort: Story = {
  args: {
    size: 'short',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkShortOutline: Story = {
  args: {
    size: 'short',
    variant: 'outline',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkIcon: Story = {
  args: {
    size: 'icon',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkIconOutline: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkRectangle: Story = {
  args: {
    radius: 'rectangular',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkRectangleOutline: Story = {
  args: {
    radius: 'rectangular',
    variant: 'outline',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkRectangleShort: Story = {
  args: {
    radius: 'rectangular',
    size: 'short',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkRectangleShortOutline: Story = {
  args: {
    radius: 'rectangular',
    size: 'short',
    variant: 'outline',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkRectangleIcon: Story = {
  args: {
    radius: 'rectangular',
    size: 'icon',
  },
  globals: {
    theme: 'dark',
  },
};

export const DarkRectangleIconOutline: Story = {
  args: {
    radius: 'rectangular',
    size: 'icon',
    variant: 'outline',
  },
  globals: {
    theme: 'dark',
  },
};

export const InteractionTestWithMockedAuth: Story = {
  args: {
    onAuthError: fn(),
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    // Wait for the auth provider to load and the button to appear
    const loginButton = await findAuthButton(canvasElement, /sign in with youversion/i);
    await userEvent.click(loginButton);

    void expect(signInMock).toHaveBeenCalled();
  },
};

export const CustomText: Story = {
  args: {
    onAuthError: fn(),
    text: 'Custom Text',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    // Wait for the auth provider to load and the button to appear
    const loginButton = await findAuthButton(canvasElement, /custom text/i);
    await userEvent.click(loginButton);

    void expect(signInMock).toHaveBeenCalled();
  },
};
