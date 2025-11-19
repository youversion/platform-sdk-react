import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleSDKProvider } from '@youversion/platform-react-hooks';
import { BibleVersionPicker, type RootProps } from './bible-version-picker';
import { useState } from 'react';
import { screen, userEvent, within, expect } from 'storybook/test';
import { BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { http, HttpResponse } from 'msw';

const withProvider = (Story: React.ComponentType) => (
  <BibleSDKProvider
    appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
    apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
  >
    <div className="yv:h-screen yv:flex yv:justify-center yv:items-end yv:p-12">
      <Story />
    </div>
  </BibleSDKProvider>
);

const PickerWrapper = ({ versionId: initialVersionId = 111, ...props }: RootProps) => {
  const [versionId, setVersionId] = useState(initialVersionId);
  return (
    <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId} {...props}>
      <BibleVersionPicker.Trigger />
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  );
};

const meta = {
  title: 'Components/BibleVersionPicker',
  component: PickerWrapper,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get(/\/v1\/bibles\/111($|\/|\?)/, () => {
          return HttpResponse.json({
            id: 111,
            abbreviation: 'NIV11',
            copyright_long:
              "Biblica is the worldwide publisher and translation sponsor of the New International Version—one of the most widely read contemporary English versions of the Bible.\nAt Biblica, we believe that with God, all things are possible. Partnering with other ministries and people like you, we are reaching the world with God's Word, providing Bibles that are easier to understand and faster to receive. When God's Word is put into someone's hands, it has the power to change everything.\nTo learn more, visit biblica.com and facebook.com/Biblica.",
            copyright_short:
              'The Holy Bible, New International Version® NIV®\nCopyright © 1973, 1978, 1984, 2011 by Biblica, Inc.®\nUsed by Permission of Biblica, Inc.® All rights reserved worldwide.',
            info: null,
            publisher_url: 'https://www.biblica.com/yv-learn-more/',
            language_tag: 'en',
            local_abbreviation: 'NIV',
            local_title: 'New International Version',
            title: 'New International Version 2011',
            books: [
              'GEN',
              'EXO',
              'LEV',
              'NUM',
              'DEU',
              'JOS',
              'JDG',
              'RUT',
              '1SA',
              '2SA',
              '1KI',
              '2KI',
              '1CH',
              '2CH',
              'EZR',
              'NEH',
              'EST',
              'JOB',
              'PSA',
              'PRO',
              'ECC',
              'SNG',
              'ISA',
              'JER',
              'LAM',
              'EZK',
              'DAN',
              'HOS',
              'JOL',
              'AMO',
              'OBA',
              'JON',
              'MIC',
              'NAM',
              'HAB',
              'ZEP',
              'HAG',
              'ZEC',
              'MAL',
              'MAT',
              'MRK',
              'LUK',
              'JHN',
              'ACT',
              'ROM',
              '1CO',
              '2CO',
              'GAL',
              'EPH',
              'PHP',
              'COL',
              '1TH',
              '2TH',
              '1TI',
              '2TI',
              'TIT',
              'PHM',
              'HEB',
              'JAS',
              '1PE',
              '2PE',
              '1JN',
              '2JN',
              '3JN',
              'JUD',
              'REV',
            ],
            youversion_deep_link: 'https://www.bible.com/versions/111',
            organization_id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
          });
        }),
        http.get(/\/v1\/languages/, () => {
          return HttpResponse.json({
            data: [
              {
                id: 'en',
                language: 'en',
                script: 'Latn',
                script_name: 'Latin',
                aliases: ['eng'],
                display_names: { en: 'English' },
                scripts: ['Latn'],
                variants: [
                  'basiceng',
                  'boont',
                  'cornu',
                  'emodeng',
                  'oxendict',
                  'scotland',
                  'scouse',
                  'spanglis',
                  'unifon',
                ],
                countries: [
                  'BB',
                  'BS',
                  'BZ',
                  'CK',
                  'GG',
                  'GS',
                  'GY',
                  'IM',
                  'IO',
                  'KI',
                  'SB',
                  'CQ',
                  'GB',
                  'IE',
                  'JM',
                  'KN',
                  'KY',
                  'TC',
                  'VG',
                  'GD',
                  'NF',
                  'VC',
                  'AI',
                  'JE',
                  'NR',
                  'DM',
                  'FJ',
                  'MH',
                  'SG',
                  'BM',
                  'PN',
                  'LC',
                  'MT',
                  'TT',
                  'CA',
                  'AG',
                  'CX',
                  'LR',
                  'VU',
                  'BW',
                  'GI',
                  'SZ',
                  'FK',
                  'MU',
                  'TZ',
                  'SH',
                  'SX',
                  'MS',
                  'PH',
                  'MW',
                  'SD',
                  'ER',
                  'FM',
                  'NU',
                  'NG',
                  'HK',
                  'PG',
                  'PK',
                  'ZW',
                  'GM',
                  'CM',
                  'SC',
                  'TK',
                  'SL',
                  'ZA',
                  'TO',
                  'LS',
                  'SS',
                  'GH',
                  'IN',
                  'KE',
                  'MG',
                  'ZM',
                  'RW',
                  'TV',
                  'PW',
                  'NA',
                  'UG',
                  'WS',
                  'BI',
                  'UM',
                  'DG',
                  'NZ',
                  'AS',
                  'MP',
                  'AU',
                  'US',
                  'GU',
                  'VI',
                  'PR',
                  'CC',
                ],
                text_direction: 'ltr',
                writing_population: 1327104050,
                speaking_population: 1636485840,
                default_bible_id: 111,
              },
              {
                id: 'ko',
                language: 'ko',
                script: 'Kore',
                script_name: '한국 문자',
                aliases: ['kor'],
                display_names: { en: 'Korean', ko: '한국어' },
                scripts: ['Kore'],
                variants: [],
                countries: ['KR', 'KP'],
                text_direction: 'ltr',
                writing_population: 77143580,
                speaking_population: 78357046,
                default_bible_id: null,
              },
            ],
            next_page_token: 'eyJzdGFydCI6IDI1fQ==',
            total_size: 141,
          });
        }),
        http.get(/\/v1\/bibles/, () => {
          return HttpResponse.json({
            data: [
              {
                id: 110,
                abbreviation: 'NIrV',
                copyright_long:
                  "Biblica is a global Bible ministry inspired by radical generosity. We are motivated by the belief that God's Word radically changes lives, and that everyone everywhere deserves to experience its truth for themselves. To that end, we pioneer ways to break down barriers to the Bible, doing whatever it takes to activate Scripture where needed most.\nNow in its third century of ministry, Biblica continues to produce relevant, reliable Scripture translations and innovative resources that power the Bible ministry of hundreds of global mission organizations. Together, we invite millions to discover the love of Jesus Christ through our three core pillars of ministry:\nGateway Translation\nWe translate God's Word for the world's most strategic languages, catalyzing greater reach to Bibleless language communities.\nFrontline Church\nWe equip the frontlines of Gospel ministry with Scripture resources that serve the unreached, unengaged, and unseen.\nKids in Crisis\nWe develop and deploy Bible programs that bring the love of Jesus to children and youth in the world's hardest places.",
                copyright_short:
                  "Holy Bible, New International Reader's Version®, NIrV®\nCopyright © 1995, 1996, 1998, 2014 by Biblica, Inc.®\nUsed by permission. All rights reserved worldwide.",
                info: null,
                publisher_url: 'https://www.biblica.com/yv-learn-more/',
                language_tag: 'en',
                local_abbreviation: 'NIrV',
                local_title: "New International Reader's Version",
                title: "New International Reader's Version 2014",
                books: [
                  'GEN',
                  'EXO',
                  'LEV',
                  'NUM',
                  'DEU',
                  'JOS',
                  'JDG',
                  'RUT',
                  '1SA',
                  '2SA',
                  '1KI',
                  '2KI',
                  '1CH',
                  '2CH',
                  'EZR',
                  'NEH',
                  'EST',
                  'JOB',
                  'PSA',
                  'PRO',
                  'ECC',
                  'SNG',
                  'ISA',
                  'JER',
                  'LAM',
                  'EZK',
                  'DAN',
                  'HOS',
                  'JOL',
                  'AMO',
                  'OBA',
                  'JON',
                  'MIC',
                  'NAM',
                  'HAB',
                  'ZEP',
                  'HAG',
                  'ZEC',
                  'MAL',
                  'MAT',
                  'MRK',
                  'LUK',
                  'JHN',
                  'ACT',
                  'ROM',
                  '1CO',
                  '2CO',
                  'GAL',
                  'EPH',
                  'PHP',
                  'COL',
                  '1TH',
                  '2TH',
                  '1TI',
                  '2TI',
                  'TIT',
                  'PHM',
                  'HEB',
                  'JAS',
                  '1PE',
                  '2PE',
                  '1JN',
                  '2JN',
                  '3JN',
                  'JUD',
                  'REV',
                ],
                youversion_deep_link: 'https://www.bible.com/versions/110',
                organization_id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
              },
              {
                id: 111,
                abbreviation: 'NIV11',
                copyright_long:
                  "Biblica is the worldwide publisher and translation sponsor of the New International Version—one of the most widely read contemporary English versions of the Bible.\nAt Biblica, we believe that with God, all things are possible. Partnering with other ministries and people like you, we are reaching the world with God's Word, providing Bibles that are easier to understand and faster to receive. When God's Word is put into someone's hands, it has the power to change everything.\nTo learn more, visit biblica.com and facebook.com/Biblica.",
                copyright_short:
                  'The Holy Bible, New International Version® NIV®\nCopyright © 1973, 1978, 1984, 2011 by Biblica, Inc.®\nUsed by Permission of Biblica, Inc.® All rights reserved worldwide.',
                info: null,
                publisher_url: 'https://www.biblica.com/yv-learn-more/',
                language_tag: 'en',
                local_abbreviation: 'NIV',
                local_title: 'New International Version',
                title: 'New International Version 2011',
                books: [
                  'GEN',
                  'EXO',
                  'LEV',
                  'NUM',
                  'DEU',
                  'JOS',
                  'JDG',
                  'RUT',
                  '1SA',
                  '2SA',
                  '1KI',
                  '2KI',
                  '1CH',
                  '2CH',
                  'EZR',
                  'NEH',
                  'EST',
                  'JOB',
                  'PSA',
                  'PRO',
                  'ECC',
                  'SNG',
                  'ISA',
                  'JER',
                  'LAM',
                  'EZK',
                  'DAN',
                  'HOS',
                  'JOL',
                  'AMO',
                  'OBA',
                  'JON',
                  'MIC',
                  'NAM',
                  'HAB',
                  'ZEP',
                  'HAG',
                  'ZEC',
                  'MAL',
                  'MAT',
                  'MRK',
                  'LUK',
                  'JHN',
                  'ACT',
                  'ROM',
                  '1CO',
                  '2CO',
                  'GAL',
                  'EPH',
                  'PHP',
                  'COL',
                  '1TH',
                  '2TH',
                  '1TI',
                  '2TI',
                  'TIT',
                  'PHM',
                  'HEB',
                  'JAS',
                  '1PE',
                  '2PE',
                  '1JN',
                  '2JN',
                  '3JN',
                  'JUD',
                  'REV',
                ],
                youversion_deep_link: 'https://www.bible.com/versions/111',
                organization_id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
              },
            ],
            next_page_token: null,
            total_size: 14,
          });
        }),
      ],
    },
  },
  decorators: [withProvider],
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The version ID to display',
    },
    background: {
      control: 'select',
      options: ['light', 'dark'],
      description: 'Background theme for the picker',
    },
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'Popover side position',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PickerWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    versionId: 111,
    background: 'light',
    side: 'top',
  },
};

export const LightBackground: Story = {
  args: {
    versionId: 1,
    background: 'light',
  },
  tags: ['integration'],
};

export const DarkBackground: Story = {
  args: {
    versionId: 1,
    background: 'dark',
  },
  tags: ['integration'],
};

export const WithCustomTrigger: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  render: (args) => (
    <BibleVersionPicker.Root
      versionId={args.versionId}
      background={args.background}
      side={args.side}
    >
      <BibleVersionPicker.Trigger>
        <Button size="icon">
          <BookOpen className="yv:w-4 yv:h-4" />
        </Button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  ),
};

export const InteractiveLanguageSelection: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open popover
    const trigger = await canvas.findByRole('button', { name: /NIV/i }, { timeout: 10_000 });
    await userEvent.click(trigger);

    // Validate the dialog is open
    // P.S. I use screen here because the Popover uses a Portal that moves
    // the element out of the original canvas element.
    const dialog = await screen.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    // Click language button
    const languageButton = await screen.findByRole('button', { name: /select language/i });
    await expect(languageButton).toHaveTextContent('English');
    await userEvent.click(languageButton);

    // Verify language list is visible
    const selectLanguageHeading = await screen.findByRole('heading', { name: /select language/i });
    await expect(selectLanguageHeading).toBeInTheDocument();

    // Select Korean
    const koreanOption = await screen.findByRole('listitem', { name: /korean/i });
    await userEvent.click(koreanOption);

    await expect(languageButton).toHaveTextContent(/korean/i);
    await userEvent.click(languageButton);
  },
};

export const InteractiveVersionSearch: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open popover
    const trigger = canvas.getByRole('button', { name: /select|111|1/i });
    await userEvent.click(trigger);

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'NIV', { delay: 50 });

    // Verify search is working (versions should be filtered)
    await expect(searchInput).toHaveValue('NIV');

    await expect(
      await screen.findByRole(
        'listitem',
        { name: /new international version 2011/i },
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
  },
};
