import type { Meta, StoryObj } from '@storybook/react';
import BibleViewer from '../components/BibleViewer';
import { Providers } from '../app/providers';

const meta = {
  title: 'Bible/Viewer',
  component: BibleViewer,
  decorators: [
    (Story) => (
      <Providers>
        <div style={{ height: '600px', width: '100%' }}>
          <Story />
        </div>
      </Providers>
    ),
  ],
} satisfies Meta<typeof BibleViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomVersion: Story = {
  args: {
    // Add any props your BibleViewer accepts
    versionId: 3034,
  },
};

export const DifferentBook: Story = {
  args: {
    defaultBook: 'PSA',
    defaultChapter: 23,
  },
};
