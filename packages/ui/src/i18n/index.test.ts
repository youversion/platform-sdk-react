/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import i18next from 'i18next';
import i18n, { resources } from './index';
import en from './locales/en.json';

async function ensureInitialized(): Promise<void> {
  if (i18n.isInitialized) return;
  await new Promise<void>((resolve) => {
    i18n.on('initialized', () => resolve());
  });
}

describe('i18n instance', () => {
  beforeAll(async () => {
    await ensureInitialized();
  });

  afterEach(async () => {
    if (i18n.language !== 'en') {
      await i18n.changeLanguage('en');
    }
    // Remove any bundles added by individual tests so module state stays en-only.
    if (i18n.hasResourceBundle('fr', 'translation')) {
      i18n.removeResourceBundle('fr', 'translation');
    }
    if (i18n.hasResourceBundle('zz', 'translation')) {
      i18n.removeResourceBundle('zz', 'translation');
    }
  });

  describe('initialization', () => {
    it('is initialized after module load', () => {
      expect(i18n.isInitialized).toBe(true);
    });

    it('uses "en" as the fallback language', () => {
      expect(i18n.options.fallbackLng).toEqual(['en']);
    });

    it('uses "translation" as the default namespace', () => {
      expect(i18n.options.defaultNS).toBe('translation');
    });

    it('exposes the English resource bundle via the named export', () => {
      expect(resources.en.translation).toEqual(en);
    });

    it('registers the English bundle on the instance', () => {
      expect(i18n.getResourceBundle('en', 'translation')).toEqual(en);
    });

    it('is an isolated instance, not the global i18next singleton', () => {
      expect(i18n).not.toBe(i18next);
    });
  });

  describe('translation resolution', () => {
    it('resolves the known "verseOfTheDay" key', () => {
      expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);
    });

    it('returns the key itself when the translation is missing', () => {
      expect(i18n.t('doesNotExist')).toBe('doesNotExist');
    });
  });

  describe('changeLanguage', () => {
    it('switches the active language when a bundle is registered', async () => {
      i18n.addResourceBundle('fr', 'translation', { verseOfTheDay: 'Verset du jour' });
      await i18n.changeLanguage('fr');
      expect(i18n.language).toBe('fr');
      expect(i18n.t('verseOfTheDay')).toBe('Verset du jour');
    });

    it('falls back to English for unknown languages', async () => {
      await i18n.changeLanguage('zz');
      expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);
    });
  });
});
