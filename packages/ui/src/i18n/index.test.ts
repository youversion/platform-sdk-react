/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import { getBrowserLanguages, resolveBrowserLanguage } from './detectLanguage';

const supportedLngs = ['en', 'fr', 'es'] as const;
const fallbackLng = 'en';

async function loadI18n() {
  const { default: i18n } = await import('./index');
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => {
      const handler = () => {
        i18n.off('initialized', handler);
        resolve();
      };
      i18n.on('initialized', handler);
    });
  }
  return i18n;
}

describe('resolveBrowserLanguage', () => {
  it('maps regional English tags to en', () => {
    expect(resolveBrowserLanguage(['en-US', 'en'], supportedLngs, fallbackLng)).toBe('en');
  });

  it('maps regional French tags to fr', () => {
    expect(resolveBrowserLanguage(['fr-FR', 'fr'], supportedLngs, fallbackLng)).toBe('fr');
  });

  it('maps regional Spanish tags to es', () => {
    expect(resolveBrowserLanguage(['es-MX', 'es'], supportedLngs, fallbackLng)).toBe('es');
  });

  it('falls back to en for unsupported browser languages', () => {
    expect(resolveBrowserLanguage(['de-DE', 'de'], supportedLngs, fallbackLng)).toBe('en');
  });

  it('falls back to en when browser languages are unavailable', () => {
    expect(resolveBrowserLanguage(undefined, supportedLngs, fallbackLng)).toBe('en');
  });

  it('uses the first supported language in the preference list', () => {
    expect(resolveBrowserLanguage(['de-DE', 'fr-FR', 'en-US'], supportedLngs, fallbackLng)).toBe(
      'fr',
    );
  });
});

describe('getBrowserLanguages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns navigator.languages when available', () => {
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['fr-FR', 'en-US'],
    });

    expect(getBrowserLanguages()).toEqual(['fr-FR', 'en-US']);
  });

  it('falls back to navigator.language when languages is empty', () => {
    vi.stubGlobal('navigator', {
      language: 'es-ES',
      languages: [],
    });

    expect(getBrowserLanguages()).toEqual(['es-ES']);
  });
});

describe('i18n instance', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('resolves keys from the English bundle when browser language is en-US', async () => {
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['en-US'],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    expect(i18n.language).toBe('en');
    expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);
  });

  it('uses French strings when the browser prefers fr-FR', async () => {
    vi.stubGlobal('navigator', {
      language: 'fr-FR',
      languages: ['fr-FR', 'fr'],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    expect(i18n.language).toBe('fr');
    expect(i18n.t('verseOfTheDay')).toBe(fr.verseOfTheDay);
  });

  it('uses Spanish strings when the browser prefers es-MX', async () => {
    vi.stubGlobal('navigator', {
      language: 'es-MX',
      languages: ['es-MX', 'es'],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    expect(i18n.language).toBe('es');
    expect(i18n.t('verseOfTheDay')).toBe(es.verseOfTheDay);
  });

  it('falls back to English for unsupported browser languages', async () => {
    vi.stubGlobal('navigator', {
      language: 'de-DE',
      languages: ['de-DE', 'de'],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    expect(i18n.language).toBe('en');
    expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);
  });
});
