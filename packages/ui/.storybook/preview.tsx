import React, { useEffect, useLayoutEffect } from 'react';
import type { Preview, ReactRenderer } from '@storybook/react-vite';
import type { PartialStoryFn, StoryContext } from 'storybook/internal/csf';

function getTheme(value: unknown): 'light' | 'dark' | 'system' {
  if (value === 'dark') return 'dark';
  if (value === 'system') return 'system';
  return 'light';
}

import { initialize, mswLoader } from 'msw-storybook-addon';
import { StorybookEnvCheck } from '../src/test/StorybookEnvCheck';
import { YouVersionProvider } from '../src/components/YouVersionProvider';
import { globalHandlers } from '../src/test/mocks/handlers';
import {
  injectConsumerCss,
  resetConsumerHost,
  resolveConsumerCssGroups,
} from '../src/test/consumer-host';
import type { ConsumerCssGroup } from '../src/test/consumer-host';

/**
 * Consumer host CSS, per story, through `parameters.consumerHost`.
 *
 * `'all'` injects every group. An array injects only the named groups. Without
 * the parameter, the decorator injects nothing, and every earlier story is
 * unchanged.
 */
type ConsumerHostParameter = ConsumerCssGroup[] | 'all' | undefined;

function getConsumerCssGroups(parameters: {
  consumerHost?: ConsumerHostParameter;
}): ConsumerCssGroup[] {
  const value = parameters.consumerHost;
  return value === undefined ? [] : resolveConsumerCssGroups(value);
}

const THEME_BACKGROUNDS: Record<string, string> = {
  light: '#ffffff',
  dark: 'oklch(0.138 0.001 17.2)',
  system: '',
};

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

      // A string key, not the array, so the effect does not run again on every
      // render.
      const consumerKey = getConsumerCssGroups(context.parameters).join(',');

      // Layout effect, not effect. The SDK `<style precedence="yv-sdk">` tag is
      // in <head> by commit time, so an append here always lands after it. That
      // is the source order that a real consumer app produces.
      useLayoutEffect(() => {
        if (consumerKey === '') return undefined;
        injectConsumerCss(consumerKey.split(',') as ConsumerCssGroup[]);

        // resetConsumerHost, and not the cleanup function that injectConsumerCss
        // returns. A play function injects again during a measurement, and those
        // tags have no owner. A tag left behind follows the next story into the
        // same iframe, and so does the body id that `highSpecificity` targets.
        return resetConsumerHost;
      }, [consumerKey]);

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
            theme={getTheme(context.globals.theme)}
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
