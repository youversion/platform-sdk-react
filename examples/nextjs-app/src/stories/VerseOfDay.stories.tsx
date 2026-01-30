import type { Meta, StoryObj } from '@storybook/react';
import { VerseOfTheDay } from '@youversion/platform-react-ui';
import { Providers } from '../app/providers';

const meta = {
  title: 'Bible/VerseOfDay',
  component: VerseOfTheDay,
  decorators: [
    (Story) => (
      <Providers>
        <div className="p-8">
          <Story />
        </div>
      </Providers>
    ),
  ],
} satisfies Meta<typeof VerseOfTheDay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    versionId: 111,
  },
};
