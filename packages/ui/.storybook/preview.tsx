import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { StorybookEnvCheck } from '../src/test/StorybookEnvCheck';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { globalHandlers } from '../src/test/mocks/handlers';
import '../dist/tailwind.css';

/*
 * Initializes MSW with global handlers
 * See https://github.com/mswjs/msw-storybook-addon#configuring-msw
 * to learn how to customize it
 */
initialize({
  onUnhandledRequest: 'warn',
});

const preview: Preview = {
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <StorybookEnvCheck
        requiredEnvVars={['STORYBOOK_YOUVERSION_APP_KEY', 'STORYBOOK_AUTH_REDIRECT_URL']}
      >
        <YouVersionProvider
          appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || ''}
          authRedirectUrl={import.meta.env.STORYBOOK_AUTH_REDIRECT_URL || ''}
          includeAuth={true}
        >
          <Story />
        </YouVersionProvider>
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
    msw: {
      handlers: globalHandlers,
    },
  },
  loaders: [mswLoader], // Adds the MSW loader to all stories
};

export default preview;
