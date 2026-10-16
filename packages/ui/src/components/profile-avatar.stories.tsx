import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { waitForShadowRoot } from '../test/storybook-dom';
import { ProfileAvatar } from './profile-avatar';

const TEST_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="%23121212"/%3E%3C/svg%3E';
const ERROR_IMAGE = 'data:image/png;base64,AAAA';

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
    const root = await waitForShadowRoot(canvasElement);
    const img = await waitFor(() => {
      const candidate = root.querySelector('img');
      if (!candidate) throw new Error('avatar image not rendered');
      return candidate;
    });
    await expect(img).toHaveAttribute('src', TEST_IMAGE);
    await waitFor(async () => {
      await expect(root.querySelector('[data-slot="avatar-fallback"]')).toBeNull();
    });
  },
};

export const InitialsFallback: Story = {
  args: {
    name: 'Cam Anderson',
    src: ERROR_IMAGE,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    await waitFor(async () => {
      await expect(root.querySelector('[data-slot="avatar-fallback"]')).toHaveTextContent('CA');
      await expect(root.querySelector('img')).toBeNull();
    });
    await expect(root.querySelector('[data-slot="avatar"]')).toHaveAttribute(
      'aria-label',
      'Cam Anderson',
    );
  },
};

export const SingleName: Story = {
  args: {
    name: 'Cher',
  },
};

export const EmptyName: Story = {
  args: {
    name: '',
  },
};
