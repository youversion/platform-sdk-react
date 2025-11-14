import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { BibleReader } from './bible-reader';
import { BibleSDKProvider } from '@youversion/platform-react-hooks';

const meta: Meta<typeof BibleReader.Root> = {
  title: 'Components/BibleReader',
  component: BibleReader.Root,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <BibleSDKProvider appId={import.meta.env.STORYBOOK_YOUVERSION_APP_ID || ''}>
        <Story />
      </BibleSDKProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BibleReader.Root>;

/**
 * Default uncontrolled story: Component manages its own state with John 1 NIV as default
 */
export const Default: Story = {
  render: () => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
};

/**
 * Dark theme
 */
export const DarkTheme: Story = {
  render: () => (
    <div className="yv:h-screen yv:bg-background yv:dark">
      <BibleReader.Root background="dark">
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
};

/**
 * Custom styling with larger font and increased line height
 */
export const CustomStyling: Story = {
  render: () => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root
        fontSize={18}
        lineHeight={1.8}
        fontFamily="'Nunito Sans', sans-serif"
        showVerseNumbers={false}
      >
        <BibleReader.Toolbar border="bottom" />
        <BibleReader.Content />
      </BibleReader.Root>
    </div>
  ),
};
