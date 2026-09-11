import type { PassageStylesheet } from './schemas/passage-display';
import type { ApiConfig } from './types';

/**
 * The YouVersion stylesheet for Bible HTML. The path is a CSS compatibility
 * major, not the version of this package; routine UI releases overwrite it.
 */
export const BIBLE_CSS_STYLESHEET_URL = 'https://cdn.youversion.com/platform/1/bible.css';

/** The permanent Fonts API identifier for Untitled Serif. */
export const UNTITLED_SERIF_FONT_ID = 1;

/** Returns the ordered stylesheet resources for displaying Bible HTML. */
export function getBibleStylesheets(
  config: Pick<ApiConfig, 'appKey' | 'apiHost'>,
): readonly PassageStylesheet[] {
  if (!config.appKey.trim()) {
    throw new Error('A non-empty app key is required to build Bible stylesheet resources.');
  }

  const apiHost = config.apiHost || 'api.youversion.com';
  return [
    {
      kind: 'bible',
      rel: 'stylesheet',
      href: BIBLE_CSS_STYLESHEET_URL,
    },
    {
      kind: 'font',
      rel: 'stylesheet',
      href: `https://${apiHost}/v1/fonts/${UNTITLED_SERIF_FONT_ID}/stylesheet?app_key=${encodeURIComponent(config.appKey)}`,
    },
  ];
}
