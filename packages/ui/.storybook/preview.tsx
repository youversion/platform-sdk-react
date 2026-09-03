import React, { Suspense, useEffect } from 'react';
import type { Preview, ReactRenderer } from '@storybook/react-vite';
import type { PartialStoryFn, StoryContext } from 'storybook/internal/csf';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { YouVersionProvider } from '../src/components/YouVersionProvider';
import { YvComponentStyles } from '../src/lib/yv-styles-components';
import { YvReaderStyles } from '../src/lib/yv-styles-reader';
import { globalHandlers } from '../src/test/mocks/handlers';
import { StorybookEnvCheck } from '../src/test/StorybookEnvCheck';

function getTheme(value: string | undefined): 'light' | 'dark' | 'system' {
  if (value === 'dark') return 'dark';
  if (value === 'system') return 'system';
  return 'light';
}

function StoryWithSdkSheets({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <Suspense fallback={null}>
        <YvComponentStyles />
        <YvReaderStyles />
      </Suspense>
      {children}
    </>
  );
}

const THEME_BACKGROUNDS = {
  light: '#ffffff',
  dark: 'oklch(0.138 0.001 17.2)',
  system: '',
} as const;

/*
 * Initializes MSW with global handlers
 * See https://github.com/mswjs/msw-storybook-addon#configuring-msw
 * to learn how to customize it
 */
initialize({
  onUnhandledRequest: 'warn',
  quiet: true,
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
          { value: 'system', title: 'System', icon: 'browser' },
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
    ): React.ReactElement => {
      const theme = getTheme(context.globals.theme);

      useEffect(() => {
        const bg = THEME_BACKGROUNDS[theme] || '';
        document.body.style.backgroundColor = bg;
        return () => {
          document.body.style.backgroundColor = '';
        };
      }, [theme]);

      const includeAuth = context.parameters.includeAuth !== false;
      const requiredEnvVars = includeAuth
        ? ['STORYBOOK_YOUVERSION_APP_KEY', 'STORYBOOK_AUTH_REDIRECT_URL']
        : ['STORYBOOK_YOUVERSION_APP_KEY'];

      if (includeAuth) {
        return (
          <StorybookEnvCheck requiredEnvVars={requiredEnvVars}>
            <YouVersionProvider
              appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || ''}
              authRedirectUrl={import.meta.env.STORYBOOK_AUTH_REDIRECT_URL || ''}
              apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
              includeAuth={true}
              theme={getTheme(context.globals.theme)}
            >
              <StoryWithSdkSheets>
                <Story />
              </StoryWithSdkSheets>
            </YouVersionProvider>
          </StorybookEnvCheck>
        );
      }

      return (
        <StorybookEnvCheck requiredEnvVars={requiredEnvVars}>
          <YouVersionProvider
            appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || ''}
            apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
            theme={getTheme(context.globals.theme)}
          >
            <StoryWithSdkSheets>
              <Story />
            </StoryWithSdkSheets>
          </YouVersionProvider>
        </StorybookEnvCheck>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    msw: {
      handlers: globalHandlers,
    },
  },
  loaders: [mswLoader], // Adds the MSW loader to all stories
};

export default preview;
