import React from 'react';
import type { Preview, ReactRenderer } from '@storybook/react-vite';
import type { PartialStoryFn, StoryContext } from 'storybook/internal/csf';

function getTheme(value: unknown): 'light' | 'dark' {
  return value === 'dark' ? 'dark' : 'light';
}
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
  globalTypes: {
    theme: {
      description: 'Provider theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (
      Story: PartialStoryFn<ReactRenderer>,
      context: StoryContext<ReactRenderer>,
    ): React.ReactElement => (
      <StorybookEnvCheck
        requiredEnvVars={['STORYBOOK_YOUVERSION_APP_KEY', 'STORYBOOK_AUTH_REDIRECT_URL']}
      >
        <YouVersionProvider
          appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || ''}
          authRedirectUrl={import.meta.env.STORYBOOK_AUTH_REDIRECT_URL || ''}
          apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
          includeAuth={true}
          theme={getTheme(context.globals.theme)}
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
