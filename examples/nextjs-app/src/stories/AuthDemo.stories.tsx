import type { Meta, StoryObj } from '@storybook/react';
import { AuthButton } from '../components/AuthDemo';
import { Providers } from '../app/providers';

const meta = {
  title: 'Components/AuthDemo',
  component: AuthButton,
  decorators: [
    (Story) => (
      <Providers>
        <div className="p-8">
          <Story />
        </div>
      </Providers>
    ),
  ],
} satisfies Meta<typeof AuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LoggedOut: Story = {
  parameters: {
    // You can mock auth state here if needed
  },
};

export const LoggedIn: Story = {
  parameters: {
    // Mock authenticated state
  },
};
