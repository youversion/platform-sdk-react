import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleSDKProvider } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { expect, within, userEvent, fn } from 'storybook/test';

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
    showReadFullChapterButton: {
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
    showReadFullChapterButton: true,
    showBibleAppAttribution: true,
    showShareButton: true,
    size: 'default',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    window.alert = fn();

    // `getByText` is synchronous and happens instantly, which allows us to check
    // that the loading text is shown before the verse.
    await expect(canvas.getByText('Loading...')).toBeInTheDocument();
    await expect(
      await canvas.findByText(/for I am about to do something new/i),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/isaiah 43:19/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Sun/i)).toBeInTheDocument();
    await expect(
      await canvas.findByRole('button', { name: /read full chapter/i }),
    ).toBeInTheDocument();
    await expect(await canvas.findByRole('button', { name: /share/i })).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Bible App/i)).toBeInTheDocument();

    // TODO - YVP-NTN-69 - Implement read full chapter functionalities.
    await userEvent.click(await canvas.findByRole('button', { name: /read full chapter/i }));
    await expect(window.alert).toHaveBeenCalled();

    // TODO - YVP-NTN-68 - Implement share functionalities.
    await userEvent.click(await canvas.findByRole('button', { name: /share/i }));
    await expect(window.alert).toHaveBeenCalledTimes(2);
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
    showReadFullChapterButton: false,
    showBibleAppAttribution: false,
  },
};
