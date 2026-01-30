import type { Meta, StoryObj } from '@storybook/react';
import { BibleTextView } from '@youversion/platform-react-ui';
import { Providers } from '../app/providers';

const meta = {
  title: 'Bible/TextView',
  component: BibleTextView,
  decorators: [
    (Story) => (
      <Providers>
        <div className="p-8">
          <Story />
        </div>
      </Providers>
    ),
  ],
} satisfies Meta<typeof BibleTextView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JohnThree16: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
  },
};

export const Psalm23: Story = {
  args: {
    reference: 'PSA.23.1',
    versionId: 111,
  },
};

export const Romans12: Story = {
  args: {
    reference: 'ROM.12.1',
    versionId: 111,
  },
};
