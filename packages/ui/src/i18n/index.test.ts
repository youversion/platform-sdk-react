/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import i18n from './index';
import en from './locales/en.json';

describe('i18n instance', () => {
  it('resolves keys from the English bundle once initialized', async () => {
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        i18n.on('initialized', () => resolve());
      });
    }
    expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);
  });
});
