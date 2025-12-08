import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { expect, waitFor, within } from 'storybook/test';
import React from 'react';

import { BibleTextView } from './verse';

const baseUrl = 'https://' + import.meta.env.STORYBOOK_YOUVERSION_API_HOST;

// USFM format: BOOK.CHAPTER or BOOK.CHAPTER.VERSE or BOOK.CHAPTER.VERSE-VERSE
const USFM_PATTERN = /^[A-Z1-4]{3}\.\d+(\.\d+(-\d+)?)?$/;

type DebouncedBibleTextViewProps = {
  reference: string;
  versionId: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  debounceMs?: number;
};

function DebouncedBibleTextView({
  reference,
  versionId,
  fontFamily,
  fontSize,
  lineHeight,
  debounceMs = 500,
}: DebouncedBibleTextViewProps): React.ReactElement | null {
  const [debouncedReference, setDebouncedReference] = React.useState(() => {
    const trimmed = reference.trim();
    if (trimmed === '') return '';
    return USFM_PATTERN.test(reference) ? reference : '';
  });
  const [debouncedVersionId, setDebouncedVersionId] = React.useState(() => {
    return Number.isInteger(versionId) && versionId > 0 ? versionId : 0;
  });
  const [isInvalid, setIsInvalid] = React.useState(() => {
    const trimmed = reference.trim();
    if (trimmed === '') return false;
    return !USFM_PATTERN.test(reference) || !(Number.isInteger(versionId) && versionId > 0);
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (reference.trim() === '') {
        setDebouncedReference('');
        setIsInvalid(false);
        return;
      }

      const isValidReference = USFM_PATTERN.test(reference);
      const isValidVersionId = Number.isInteger(versionId) && versionId > 0;

      if (isValidReference) {
        setDebouncedReference(reference);
      } else {
        setDebouncedReference('');
      }

      setIsInvalid(!isValidReference || !isValidVersionId);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [reference, versionId, debounceMs]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const isValidVersionId = Number.isInteger(versionId) && versionId > 0;
      if (isValidVersionId) {
        setDebouncedVersionId(versionId);
      } else {
        setDebouncedVersionId(0);
      }

      const trimmed = reference.trim();
      if (trimmed === '') {
        setIsInvalid(false);
      } else {
        const isValidReference = USFM_PATTERN.test(reference);
        setIsInvalid(!isValidReference || !isValidVersionId);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [versionId, reference, debounceMs]);

  if (isInvalid) {
    return (
      <div style={{ color: 'red', padding: '1rem' }}>Incorrect USFM reference: {reference}</div>
    );
  }

  if (debouncedReference.trim() === '') {
    return null;
  }

  return (
    <BibleTextView
      reference={debouncedReference}
      versionId={debouncedVersionId}
      fontFamily={fontFamily}
      fontSize={fontSize}
      lineHeight={lineHeight}
    />
  );
}

const meta = {
  title: 'Components/BibleTextView',
  component: BibleTextView,
  parameters: {
    layout: 'centered',
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
    reference: {
      control: 'text',
      description: 'USFM reference (e.g., "JHN.3.16", "JHN.3.16-17", "JHN.3")',
    },
    versionId: {
      control: 'number',
      description: 'Bible version ID (e.g., 111 for NLT)',
    },
    fontFamily: {
      control: 'text',
      description: 'Font family for the Bible text',
    },
    fontSize: {
      control: 'number',
      description: 'Font size in pixels',
    },
    lineHeight: {
      control: 'number',
      description: 'Line height',
    },
  },
} satisfies Meta<typeof BibleTextView>;

export default meta;

type Story = StoryObj<typeof meta>;

const hideArgs = {
  reference: {
    table: {
      disable: true,
    },
  },
  versionId: {
    table: {
      disable: true,
    },
  },
};

export const SingleVerse: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
  },
  argTypes: hideArgs,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get(`${baseUrl}/v1/bibles/:versionId/passages/:passageId`, () => {
          return HttpResponse.json({
            id: 'JHN.3.16',
            content:
              '<div><div class="q1"><span class="yv-v" v="16"></span><span class="yv-vlbl">16</span>For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.</div></div>',
            version_id: 111,
            reference: 'John 3:16',
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Loading...')).toBeInTheDocument();

    void waitFor(async () => {
      // The text loading indicates that the passages API
      // was called and the text is being rendered.
      await expect(await canvas.findByText(/for God so loved the world/i)).toBeInTheDocument();
    });
  },
};

export const VerseRange: Story = {
  args: {
    reference: 'JHN.3.16-17',
    versionId: 111,
  },
  argTypes: hideArgs,
  parameters: {
    msw: {
      handlers: [
        http.get(`${baseUrl}/v1/bibles/:versionId/passages/:passageId`, () => {
          return HttpResponse.json({
            id: 'JHN.3.16-17',
            content:
              '<div><div class="q1"><span class="yv-v" v="16"></span><span class="yv-vlbl">16</span>For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.</div><div class="q2"><span class="yv-v" v="17"></span><span class="yv-vlbl">17</span>For God did not send his Son into the world to condemn the world, but to save the world through him.</div></div>',
            version_id: 111,
            reference: 'John 3:16-17',
          });
        }),
      ],
    },
  },
};

export const FullChapter: Story = {
  args: {
    reference: 'JHN.3',
    versionId: 111,
  },
  argTypes: hideArgs,
  parameters: {
    msw: {
      handlers: [
        http.get(`${baseUrl}/v1/bibles/:versionId/passages/:passageId`, () => {
          return HttpResponse.json({
            id: 'JHN.3',
            content:
              '<div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews. <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>He came to Jesus by night and said to him, “Rabbi, we know that you are a teacher come from God, for no one can do these signs that you do, unless God is with him.”</div><div class="p"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Jesus answered him, <span class="wj">“Most certainly I tell you, unless one is born anew, </span><span class="wj">he can’t see God’s Kingdom.”</span></div><div class="p"><span class="yv-v" v="4"></span><span class="yv-vlbl">4</span>Nicodemus said to him, “How can a man be born when he is old? Can he enter a second time into his mother’s womb and be born?”</div><div class="p"><span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>Jesus answered, <span class="wj">“Most certainly I tell you, unless one is born of water and Spirit, he can’t enter into God’s Kingdom.</span> <span class="yv-v" v="6"></span><span class="yv-vlbl">6</span><span class="wj">That which is born of the flesh is flesh. That which is born of the Spirit is spirit. </span><span class="yv-v" v="7"></span><span class="yv-vlbl">7</span><span class="wj">Don’t marvel that I said to you, ‘You must be born anew.’ </span><span class="yv-v" v="8"></span><span class="yv-vlbl">8</span><span class="wj">The wind</span> <span class="wj">blows where it wants to, and you hear its sound, but don’t know where it comes from and where it is going. So is everyone who is born of the Spirit.”</span></div><div class="p"><span class="yv-v" v="9"></span><span class="yv-vlbl">9</span>Nicodemus answered him, “How can these things be?”</div><div class="p"><span class="yv-v" v="10"></span><span class="yv-vlbl">10</span>Jesus answered him, <span class="wj">“Are you the teacher of Israel, and don’t understand these things? </span><span class="yv-v" v="11"></span><span class="yv-vlbl">11</span><span class="wj">Most certainly I tell you, we speak that which we know and testify of that which we have seen, and you don’t receive our witness. </span><span class="yv-v" v="12"></span><span class="yv-vlbl">12</span><span class="wj">If I told you earthly things and you don’t believe, how will you believe if I tell you heavenly things? </span><span class="yv-v" v="13"></span><span class="yv-vlbl">13</span><span class="wj">No one has ascended into heaven but he who descended out of heaven, the Son of Man, who is in heaven. </span><span class="yv-v" v="14"></span><span class="yv-vlbl">14</span><span class="wj">As Moses lifted up the serpent in the wilderness, even so must the Son of Man be lifted up, </span><span class="yv-v" v="15"></span><span class="yv-vlbl">15</span><span class="wj">that whoever believes in him should not perish, but have eternal life. </span><span class="yv-v" v="16"></span><span class="yv-vlbl">16</span><span class="wj">For God so loved the world, that he gave his only born</span> <span class="wj">Son, that whoever believes in him should not perish, but have eternal life. </span><span class="yv-v" v="17"></span><span class="yv-vlbl">17</span><span class="wj">For God didn’t send his Son into the world to judge the world, but that the world should be saved through him. </span><span class="yv-v" v="18"></span><span class="yv-vlbl">18</span><span class="wj">He who believes in him is not judged. He who doesn’t believe has been judged already, because he has not believed in the name of the only born Son of God. </span><span class="yv-v" v="19"></span><span class="yv-vlbl">19</span><span class="wj">This is the judgment, that the light has come into the world, and men loved the darkness rather than the light, for their works were evil. </span><span class="yv-v" v="20"></span><span class="yv-vlbl">20</span><span class="wj">For everyone who does evil hates the light and doesn’t come to the light, lest his works would be exposed. </span><span class="yv-v" v="21"></span><span class="yv-vlbl">21</span><span class="wj">But he who does the truth comes to the light, that his works may be revealed, that they have been done in God.”</span></div><div class="p"><span class="yv-v" v="22"></span><span class="yv-vlbl">22</span>After these things, Jesus came with his disciples into the land of Judea. He stayed there with them and baptized. <span class="yv-v" v="23"></span><span class="yv-vlbl">23</span>John also was baptizing in Enon near Salim, because there was much water there. They came and were baptized; <span class="yv-v" v="24"></span><span class="yv-vlbl">24</span>for John was not yet thrown into prison. <span class="yv-v" v="25"></span><span class="yv-vlbl">25</span>Therefore a dispute arose on the part of John’s disciples with some Jews about purification. <span class="yv-v" v="26"></span><span class="yv-vlbl">26</span>They came to John and said to him, “Rabbi, he who was with you beyond the Jordan, to whom you have testified, behold, he baptizes, and everyone is coming to him.”</div><div class="p"><span class="yv-v" v="27"></span><span class="yv-vlbl">27</span>John answered, “A man can receive nothing unless it has been given him from heaven. <span class="yv-v" v="28"></span><span class="yv-vlbl">28</span>You yourselves testify that I said, ‘I am not the Christ,’ but, ‘I have been sent before him.’ <span class="yv-v" v="29"></span><span class="yv-vlbl">29</span>He who has the bride is the bridegroom; but the friend of the bridegroom, who stands and hears him, rejoices greatly because of the bridegroom’s voice. Therefore my joy is made full. <span class="yv-v" v="30"></span><span class="yv-vlbl">30</span>He must increase, but I must decrease.</div><div class="p"><span class="yv-v" v="31"></span><span class="yv-vlbl">31</span>“He who comes from above is above all. He who is from the earth belongs to the earth and speaks of the earth. He who comes from heaven is above all. <span class="yv-v" v="32"></span><span class="yv-vlbl">32</span>What he has seen and heard, of that he testifies; and no one receives his witness. <span class="yv-v" v="33"></span><span class="yv-vlbl">33</span>He who has received his witness has set his seal to this, that God is true. <span class="yv-v" v="34"></span><span class="yv-vlbl">34</span>For he whom God has sent speaks the words of God; for God gives the Spirit without measure. <span class="yv-v" v="35"></span><span class="yv-vlbl">35</span>The Father loves the Son, and has given all things into his hand. <span class="yv-v" v="36"></span><span class="yv-vlbl">36</span>One who believes in the Son has eternal life, but one who disobeysthe Son won’t see life, but the wrath of God remains on him.”</div></div>',
            version_id: 111,
            reference: 'John 3',
          });
        }),
      ],
    },
  },
};

export const RealAPI: Story = {
  render: (args) => <DebouncedBibleTextView {...args} />,
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
  },
  parameters: {
    msw: {
      handlers: [],
    },
  },
};
