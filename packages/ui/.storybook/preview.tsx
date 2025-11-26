import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { YVPProvider } from '../src/providers/YVPProvider';
import { StorybookEnvCheck } from '../src/test/StorybookEnvCheck';
import '../dist/tailwind.css';

/*
 * Initializes MSW
 * See https://github.com/mswjs/msw-storybook-addon#configuring-msw
 * to learn how to customize it
 */
initialize();

const preview: Preview = {
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <StorybookEnvCheck
        requiredEnvVars={['STORYBOOK_YOUVERSION_APP_KEY', 'STORYBOOK_AUTH_REDIRECT_URL']}
      >
        <YVPProvider
          config={{
            appKey: import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || '',
            redirectUri: import.meta.env.STORYBOOK_AUTH_REDIRECT_URL || '',
          }}
        >
          <Story />
        </YVPProvider>
      </StorybookEnvCheck>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [mswLoader], // Adds the MSW loader to all stories
};

export default preview;
