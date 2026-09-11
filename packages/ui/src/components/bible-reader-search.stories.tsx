import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';
import { BibleReader } from './bible-reader';
import { BibleReaderSearch } from './bible-reader-search';

const meta = {
  title: 'Components/BibleReaderSearch',
  component: BibleReaderSearch,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BibleReaderSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpenTrending: Story = {
  tags: ['integration'],
  render: () => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Search the Bible' }));
    await waitFor(async () => {
      await expect(screen.getByRole('option', { name: 'love' })).toBeInTheDocument();
    });
  },
};
