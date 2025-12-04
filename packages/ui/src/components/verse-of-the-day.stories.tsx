import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
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
        // https://api-staging.youversion.com/v1/bibles/1
        http.get(/\/v1\/bibles\/\d+/, () => {
          return HttpResponse.json({
            id: 1,
            abbreviation: 'KJV',
            copyright_long:
              "King James Version (KJV)  The King James Version (KJV) of the holy Bible was first printed in 1611, but the main edition used today is the 1769 version. The King James Version (KJV) is also known as the Authorized (or Authorised) Version (AV) because it was authorized to be read in churches. For over 300 years it was the main English translation used in the English speaking world, and is much admired and respected. About 400 words and phrases coined or popularised by the King James Version are part the English language today.   Revision  The King James Version of the Bible was not a new translation but a revision of the English Bible which was commissioned by King James I of Great Britain, following the Church of England Hampton Court Conference in 1604. 54 scholars from London, Oxford and Cambridge worked on the project. They were all from the Church of England (Anglicans), but included those of traditional and Puritan views. Officially the 1586 Bishop’s Bible was used as the base for the revision, but the scholars referenced all existing Bible translations in English, such as the Geneva Bible and Tyndale, and also editions in other languages. The completed Bible was first printed in 1611, and included the Apocrypha, which is omitted from this edition.   1769 edition  In 1611 English spelling and punctuation were not in standard forms, and the Bible underwent a mainly-orthographic revision by Oxford and Cambridge universities in 1769, which is the version most people use today. The rights of the King James Version of the Bible were, and still are, protected under British law and are vested in the Crown.   Bible Society edition  In 1804 the British and Foreign Bible Society (BFBS) was founded and they printed millions of cheap copies of the Bible for people to buy and read. Through the work of the Bible Societies the King James Version (KJV) became the most printed and most widely read book in the world.   1954 Paragraphed Edition  The King James Version was printed with each new verse starting on a new line. In 1954 the British and Foreign Bible Society produced a new edition of the KJV, keeping the original 1769 text, but adding sub-titles and paragraphs, making it easier to read. In 2011 this was reprinted in a special edition, with other appendices such as a Glossary, and concordance, to mark the 400th anniversary of the King James Version. This is the text used in this on-line edition. The paragraphing, sub-headings from 1954, and other additions from 2011, are copyright the British and Foreign Bible Society.  Copyright Information  Rights in the Authorized (King James) Version of the Bible are vested in the Crown. Published by permission of the Crown's patentee, Cambridge University Press.  This edition  This edition of the King James Authorised Version was paragraphed with sub-headings added by the British and Foreign Bible Society in 1954 and released again as a special edition in 2011. BFBS additions © 2011 British and Foreign Bible Society This text is maintained by the British and Foreign Bible Society If you are interested in obtaining a printed copy, please contact the British and Foreign Bible Society at www.biblesociety.org.uk",
            copyright_short:
              'Rights in the Authorized (King James) Version in the United Kingdom are vested in the Crown. Published by permission of the Crown’s patentee, Cambridge University Press.',
            info: null,
            publisher_url: null,
            language_tag: 'en',
            local_abbreviation: 'KJV',
            local_title: 'King James Version',
            title: 'King James Version',
            books: [],
            youversion_deep_link: 'https://www.bible.com/versions/1',
            organization_id: 'f819451a-bc31-4037-b4bd-0c4aa00fe0f6',
          });
        }),
      ],
    },
  },
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <YouVersionProvider
        appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
        apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
      >
        <Story />
      </YouVersionProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    background: { control: { type: 'select' }, options: ['light', 'dark'] },
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
  beforeEach: () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true, // Allows the property to be redefined later
      value: async () => {
        return Promise.resolve(); // Simulate a successful share
      },
    });
  },
  play: async ({ canvasElement }) => {
    const mockSpy = spyOn(navigator, 'share');
    const canvas = within(canvasElement);

    // Wait for component to load, then check that the loading text is shown before the verse.
    await expect(await canvas.findByText('Loading...')).toBeInTheDocument();
    await expect(
      await canvas.findByText(/for I am about to do something new/i),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/isaiah 43:19/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Sun/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Bible App/i)).toBeInTheDocument();

    await userEvent.click(await canvas.findByRole('button', { name: /share/i }));
    await expect(mockSpy).toHaveBeenCalledWith({
      // This intentionally has a non-breaking space.
      text: '19 For I am about to do something new.\nSee, I have already begun! Do you not see it?\nI will make a pathway through the wilderness.\nI will create rivers in the dry wasteland.\n\nIsaiah 43:19 KJV',
    });
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
