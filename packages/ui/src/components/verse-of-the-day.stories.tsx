import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleSDKProvider } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { expect, within, userEvent, spyOn } from 'storybook/test';

import { VerseOfTheDay } from './verse-of-the-day';

const meta = {
  title: 'Components/VerseOfTheDay',
  component: VerseOfTheDay,
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        http.get(/\/v1\/bibles\/\d+\/passages\/.+/i, () => {
          return HttpResponse.json({
            id: 'ISA.43.19',
            content:
              '<div><div class="q1"><span class="yv-v" v="19"></span><span class="yv-vlbl">19</span>For I am about to do something new.</div><div class="q2">See, I have already begun! Do you not see it?</div><div class="q1">I will make a pathway through the wilderness.</div><div class="q2">I will create rivers in the dry wasteland.</div></div>',
            version_id: 111,
            human_reference: 'Isaiah 43:19',
          });
        }),
        http.get(/\/v1\/verse_of_the_days\/\d+/, () => {
          return HttpResponse.json({ day: 1, passage_id: 'ISA.43.19' });
        }),
      ],
    },
  },
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <BibleSDKProvider
        appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
        apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
      >
        <Story />
      </BibleSDKProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    // We are intentionally not allowing controls
    // for dayOfYear and versionId, since they are
    // mocked, essentially hard-coded, above.
    versionId: {
      table: {
        disable: true,
      },
    },
    dayOfYear: {
      table: {
        disable: true,
      },
    },
    showSunIcon: {
      control: 'boolean',
    },
    showBibleAppAttribution: {
      control: 'boolean',
    },
    showShareButton: {
      control: 'boolean',
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'lg'],
    },
  },
} satisfies Meta<typeof VerseOfTheDay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: true,
    size: 'default',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const shareSpy = spyOn(navigator, 'share').mockResolvedValue();

    // `getByText` is synchronous and happens instantly, which allows us to check
    // that the loading text is shown before the verse.
    await expect(canvas.getByText('Loading...')).toBeInTheDocument();
    await expect(
      await canvas.findByText(/for I am about to do something new/i),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/isaiah 43:19/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Sun/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Bible App/i)).toBeInTheDocument();

    await userEvent.click(await canvas.findByRole('button', { name: /share/i }));
    await expect(shareSpy).toHaveBeenCalled();
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const Minimal: Story = {
  args: {
    showSunIcon: false,
    showShareButton: false,
    showBibleAppAttribution: false,
  },
};
