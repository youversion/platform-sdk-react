import type { Meta, StoryObj } from '@storybook/react';
import { BibleReader } from '@youversion/platform-react-ui';
import { Providers } from '../app/providers';

const meta = {
  title: 'Bible/Reader',
  component: BibleReader.Root,
  decorators: [
    (Story) => (
      <Providers>
        <div style={{ height: '600px', width: '100%' }}>
          <Story />
        </div>
      </Providers>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <BibleReader.Root defaultVersionId={3034}>
      <BibleReader.Content />
      <BibleReader.Toolbar />
    </BibleReader.Root>
  ),
};

export const Genesis: Story = {
  render: () => (
    <BibleReader.Root defaultBook="GEN" defaultChapter="1" defaultVersionId={3034}>
      <BibleReader.Content />
      <BibleReader.Toolbar />
    </BibleReader.Root>
  ),
};

export const Psalms: Story = {
  render: () => (
    <BibleReader.Root defaultBook="PSA" defaultChapter="23" defaultVersionId={3034}>
      <BibleReader.Content />
      <BibleReader.Toolbar />
    </BibleReader.Root>
  ),
};
