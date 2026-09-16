import React, { useEffect } from 'react';
import type { Preview, ReactRenderer } from '@storybook/react-vite';
import type { PartialStoryFn, StoryContext } from 'storybook/internal/csf';

function getTheme(value: string | undefined): 'light' | 'dark' | 'system' {
  if (value === 'dark') return 'dark';
  if (value === 'system') return 'system';
  return 'light';
}

import { initialize, mswLoader } from 'msw-storybook-addon';
import { StorybookEnvCheck } from '../src/test/StorybookEnvCheck';
import { YouVersionProvider } from '../src/components/YouVersionProvider';
import { globalHandlers } from '../src/test/mocks/handlers';

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
    locale: {
      description: 'Provider UI locale',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ar', title: 'Arabic' },
        ],
        dynamicTitle: true,
      },
    },
    interfaceDirection: {
      description: 'Provider interface direction',
      toolbar: {
        title: 'Interface direction',
        icon: 'transfer',
        items: [
          { value: 'ltr', title: 'LTR' },
          { value: 'rtl', title: 'RTL' },
        ],
        dynamicTitle: true,
      },
    },
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
    locale: 'en',
    interfaceDirection: 'ltr',
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
              locale={context.globals.locale}
              theme={getTheme(context.globals.theme)}
              direction={context.globals.interfaceDirection}
            >
              <Story />
            </YouVersionProvider>
          </StorybookEnvCheck>
        );
      }

      return (
        <StorybookEnvCheck requiredEnvVars={requiredEnvVars}>
          <YouVersionProvider
            appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY || ''}
            apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
            locale={context.globals.locale}
            theme={getTheme(context.globals.theme)}
            direction={context.globals.interfaceDirection}
          >
            <Story />
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
