import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within, spyOn } from 'storybook/test';
import { YouVersionAuthButton } from './YouVersionAuthButton';

// Store mock reference for interaction test
let signInMock: ReturnType<typeof fn>;

const meta = {
  title: 'Components/YouVersionAuthButton',
  component: YouVersionAuthButton,
  parameters: {
    layout: 'centered',
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
    redirectUrl: import.meta.env.STORYBOOK_AUTH_REDIRECT_URL,
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
      control: { type: 'select' },
      options: ['light', 'dark'],
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
  args: {
    background: 'dark',
  },
};

export const DarkOutline: Story = {
  args: {
    background: 'dark',
    variant: 'outline',
  },
};

export const DarkShort: Story = {
  args: {
    background: 'dark',
    size: 'short',
  },
};

export const DarkShortOutline: Story = {
  args: {
    background: 'dark',
    size: 'short',
    variant: 'outline',
  },
};

export const DarkIcon: Story = {
  args: {
    background: 'dark',
    size: 'icon',
  },
};

export const DarkIconOutline: Story = {
  args: {
    background: 'dark',
    size: 'icon',
    variant: 'outline',
  },
};

export const DarkRectangle: Story = {
  args: {
    background: 'dark',
    radius: 'rectangular',
  },
};

export const DarkRectangleOutline: Story = {
  args: {
    background: 'dark',
    radius: 'rectangular',
    variant: 'outline',
  },
};

export const DarkRectangleShort: Story = {
  args: {
    background: 'dark',
    radius: 'rectangular',
    size: 'short',
  },
};

export const DarkRectangleShortOutline: Story = {
  args: {
    background: 'dark',
    radius: 'rectangular',
    size: 'short',
    variant: 'outline',
  },
};

export const DarkRectangleIcon: Story = {
  args: {
    background: 'dark',
    radius: 'rectangular',
    size: 'icon',
  },
};

export const DarkRectangleIconOutline: Story = {
  args: {
    background: 'dark',
    radius: 'rectangular',
    size: 'icon',
    variant: 'outline',
  },
};

export const InteractionTestWithMockedAuth: Story = {
  args: {
    onAuthError: fn(),
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the auth provider to load and the button to appear
    const loginButton = await canvas.findByRole('button', { name: /sign in with youversion/i });
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
    const canvas = within(canvasElement);

    // Wait for the auth provider to load and the button to appear
    const loginButton = await canvas.findByRole('button', { name: /custom text/i });
    await userEvent.click(loginButton);

    void expect(signInMock).toHaveBeenCalled();
  },
};
