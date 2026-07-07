import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, waitFor } from 'storybook/test';
import { MissingAppKey } from './missing-app-key';

const meta = {
  title: 'Components/MissingAppKey',
  component: MissingAppKey,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="yv:w-full yv:max-w-md">
      <MissingAppKey {...args} />
    </div>
  ),
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'inline-radio',
      options: ['light', 'dark'],
      description: 'Color theme for the message',
    },
  },
} satisfies Meta<typeof MissingAppKey>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Light: Story = {
  args: {
    theme: 'light',
  },
};

export const Dark: Story = {
  args: {
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const RendersMessage: Story = {
  args: {
    theme: 'light',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeInTheDocument();
    });

    await expect(canvas.getByText('Error')).toBeInTheDocument();
    await expect(canvas.getByText(/app key/)).toBeInTheDocument();
  },
};
