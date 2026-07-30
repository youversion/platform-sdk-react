/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from './locales/en.json';
import { getBrowserLanguages, resolveBrowserLanguage } from './detectLanguage';
import { resources, supportedLngs } from './resources.generated';

const fallbackLng = 'en';

function getLanguageBase(tag: string): string {
  const base = tag.split('-')[0];
  if (!base) {
    throw new Error(`Invalid language tag: ${tag}`);
  }
  return base;
}

function getUnsupportedLanguageTag(): string {
  const candidates = ['de-DE', 'de', 'ja-JP', 'zh-CN', 'pt-BR', 'xx-XX'];
  for (const tag of candidates) {
    if (!supportedLngs.includes(getLanguageBase(tag))) {
      return tag;
    }
  }
  throw new Error('Could not find an unsupported language tag for fallback test');
}

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
  it.each(
    supportedLngs.map((lng) => ({
      lng,
      tags:
        lng === 'en' ? (['en-US', 'en'] as const) : ([`${lng}-${lng.toUpperCase()}`, lng] as const),
    })),
  )('maps regional $lng tags to $lng', ({ lng, tags }) => {
    expect(resolveBrowserLanguage([...tags], supportedLngs, fallbackLng)).toBe(lng);
  });

  it('falls back to en for unsupported browser languages', () => {
    const unsupported = getUnsupportedLanguageTag();
    expect(
      resolveBrowserLanguage(
        [unsupported, getLanguageBase(unsupported)],
        supportedLngs,
        fallbackLng,
      ),
    ).toBe('en');
  });

  it('falls back to en when browser languages are unavailable', () => {
    expect(resolveBrowserLanguage(undefined, supportedLngs, fallbackLng)).toBe('en');
  });

  it('uses the first supported language in the preference list', () => {
    const unsupported = getUnsupportedLanguageTag();
    const firstSupported = supportedLngs.find((lng) => lng !== 'en') ?? 'en';
    expect(
      resolveBrowserLanguage(
        [unsupported, `${firstSupported}-FR`, 'en-US'],
        supportedLngs,
        fallbackLng,
      ),
    ).toBe(firstSupported);
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

  it.each(
    supportedLngs.map((lng) => ({
      lng,
      browserTags:
        lng === 'en' ? (['en-US'] as const) : ([`${lng}-${lng.toUpperCase()}`, lng] as const),
    })),
  )('uses $lng strings when the browser prefers $lng', async ({ lng, browserTags }) => {
    vi.stubGlobal('navigator', {
      language: browserTags[0],
      languages: [...browserTags],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    const localeStrings = resources[lng as keyof typeof resources].translation;
    expect(i18n.language).toBe(lng);
    expect(i18n.t('verseOfTheDay')).toBe(localeStrings.verseOfTheDay);
  });

  it('falls back to English for unsupported browser languages', async () => {
    const unsupported = getUnsupportedLanguageTag();
    vi.stubGlobal('navigator', {
      language: unsupported,
      languages: [unsupported, getLanguageBase(unsupported)],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    expect(i18n.language).toBe('en');
    expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);
  });
});
