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
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The Bible version ID to display',
    },
    fontSize: {
      control: { type: 'range', min: 14, max: 24, step: 1 },
      description: 'Font size in pixels',
    },
    lineHeight: {
      control: 'select',
      options: [1.4, 1.6, 1.8, 2.0],
      description: 'Line height multiplier',
    },
    fontFamily: {
      control: 'select',
      options: ['Source Serif Pro', 'Inter', "'Georgia', serif", "'Nunito Sans', sans-serif"],
      description: 'Font family',
    },
    showVerseNumbers: {
      control: 'boolean',
      description: 'Show verse numbers',
    },
    background: {
      control: 'select',
      options: ['light', 'dark'],
      description: 'Background theme',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BibleReader.Root>;

/**
 * Default uncontrolled story: Component manages its own state with John 1 NIV as default
 */
export const Default: Story = {
  args: {
    versionId: 111,
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: "'Inter', sans-serif",
    showVerseNumbers: true,
    background: 'light',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root {...args}>
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
  args: {
    versionId: 111,
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: "'Inter', sans-serif",
    showVerseNumbers: true,
    background: 'dark',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background yv:dark">
      <BibleReader.Root {...args}>
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
  args: {
    versionId: 111,
    fontSize: 18,
    lineHeight: 2.0,
    fontFamily: "'Nunito Sans', sans-serif",
    showVerseNumbers: false,
    background: 'light',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root {...args}>
        <BibleReader.Toolbar border="bottom" />
        <BibleReader.Content />
      </BibleReader.Root>
    </div>
  ),
};
