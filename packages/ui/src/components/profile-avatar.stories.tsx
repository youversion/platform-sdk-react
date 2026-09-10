import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, waitFor } from 'storybook/test';
import { ProfileAvatar } from './profile-avatar';

const TEST_IMAGE = 'https://notion-avatar.app/image/avatar-1.jpg';

const meta = {
  title: 'Components/ProfileAvatar',
  component: ProfileAvatar,
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div data-yv-sdk>
      <ProfileAvatar {...args} />
    </div>
  ),
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Full display name; first initial is used as the fallback',
    },
    src: {
      control: 'text',
      description: 'Profile image URL',
    },
  },
} satisfies Meta<typeof ProfileAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    name: 'Cam Anderson',
    src: TEST_IMAGE,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      const img = canvasElement.querySelector('img');
      await expect(img).toBeInTheDocument();
      await expect(img).toHaveAttribute('src', TEST_IMAGE);
    });
    await expect(canvas.queryByText('CA')).not.toBeInTheDocument();
  },
};

export const InitialsFallback: Story = {
  args: {
    name: 'Cam Anderson',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByText('CA')).toBeInTheDocument();
    });
    await expect(canvasElement.querySelector('[data-slot="avatar"]')).toHaveAttribute(
      'aria-label',
      'Cam Anderson',
    );
  },
};

export const SingleName: Story = {
  args: {
    name: 'Cher',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByText('C')).toBeInTheDocument();
    });
  },
};

export const EmptyName: Story = {
  args: {
    name: '',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(canvasElement.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent(
        '',
      );
    });
  },
};
