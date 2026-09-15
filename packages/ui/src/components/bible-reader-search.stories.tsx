import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';
import { BibleReader } from './bible-reader';

const meta = {
  title: 'Components/BibleReaderSearch',
  component: BibleReader.Root,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BibleReader.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpenTrending: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    defaultBook: 'JHN',
    defaultChapter: '1',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const searchButton = await waitFor(
      () => screen.getByRole('button', { name: 'Search the Bible' }),
      { timeout: 5000 },
    );
    await userEvent.click(searchButton);

    await waitFor(async () => {
      await expect(screen.getByRole('option', { name: 'love' })).toBeInTheDocument();
    });
  },
};
