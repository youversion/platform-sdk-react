import type { Meta, StoryObj } from '@storybook/react';
import { VerseDisplay } from '../components/VerseDisplay';
import { Providers } from '../app/providers';

const meta = {
  title: 'Bible/VerseDisplay',
  component: VerseDisplay,
  decorators: [
    (Story) => (
      <Providers>
        <div className="p-8">
          <Story />
        </div>
      </Providers>
    ),
  ],
} satisfies Meta<typeof VerseDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Add default props based on your component
  },
};

export const John316: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 3034,
  },
};

export const Psalm23: Story = {
  args: {
    reference: 'PSA.23.1-6',
    versionId: 3034,
  },
};

export const CustomFont: Story = {
  args: {
    reference: 'GEN.1.1',
    versionId: 3034,
    fontFamily: 'Georgia',
    fontSize: 18,
  },
};
