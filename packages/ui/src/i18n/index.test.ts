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

/** True when resolveBrowserLanguage would select this tag against supportedLngs. */
function isLanguageSupported(tag: string): boolean {
  const supportedLower = new Map(supportedLngs.map((lng) => [lng.toLowerCase(), lng] as const));
  const lower = tag.toLowerCase();
  if (supportedLower.has(lower)) {
    return true;
  }
  return supportedLower.has(getLanguageBase(lower));
}

/**
 * Browser preference tags that should resolve to `lng`.
 * Region-qualified locales (e.g. pt-BR) must not append another region.
 */
function preferenceTagsFor(lng: string): readonly string[] {
  if (lng.includes('-')) {
    return [lng.toLowerCase(), lng];
  }
  if (lng === 'en') {
    return ['en-US', 'en'];
  }
  return [`${lng}-${lng.toUpperCase()}`, lng];
}

function getUnsupportedLanguageTag(): string {
  const candidates = ['de-DE', 'de', 'ja-JP', 'zh-CN', 'pt-BR', 'xx-XX'];
  for (const tag of candidates) {
    if (!isLanguageSupported(tag)) {
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
      tags: preferenceTagsFor(lng),
    })),
  )('maps regional $lng tags to $lng', ({ lng, tags }) => {
    expect(resolveBrowserLanguage([...tags], supportedLngs, fallbackLng)).toBe(lng);
  });

  it('matches region-qualified supported locales exactly', () => {
    const supported = ['en', 'pt-BR'] as const;
    expect(resolveBrowserLanguage(['pt-BR'], supported, fallbackLng)).toBe('pt-BR');
    expect(resolveBrowserLanguage(['pt-br'], supported, fallbackLng)).toBe('pt-BR');
    expect(resolveBrowserLanguage(['pt-PT', 'pt-BR'], supported, fallbackLng)).toBe('pt-BR');
  });

  it('does not map a bare language to an unrelated region-qualified locale', () => {
    const supported = ['en', 'pt-BR'] as const;
    expect(resolveBrowserLanguage(['pt'], supported, fallbackLng)).toBe('en');
    expect(resolveBrowserLanguage(['pt-PT'], supported, fallbackLng)).toBe('en');
  });

  it.each(['nb', 'nb-NO', 'nn', 'nn-NO'] as const)('maps Norwegian browser tag %s to no', (tag) => {
    expect(resolveBrowserLanguage([tag], supportedLngs, fallbackLng)).toBe('no');
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
    const regionalPreference = firstSupported.includes('-')
      ? firstSupported
      : `${firstSupported}-FR`;
    expect(
      resolveBrowserLanguage(
        [unsupported, regionalPreference, 'en-US'],
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

  it('works when navigator exists without window (Node 21+)', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('navigator', {
      language: 'de-DE',
      languages: ['de-DE'],
    });

    expect(getBrowserLanguages()).toEqual(['de-DE']);
  });

  it('returns undefined when window exists but navigator is missing', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', undefined);

    expect(getBrowserLanguages()).toBeUndefined();
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
      browserTags: preferenceTagsFor(lng),
    })),
  )('uses $lng strings when the browser prefers $lng', async ({ lng, browserTags }) => {
    vi.stubGlobal('navigator', {
      language: browserTags[0],
      languages: [...browserTags],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    const localeStrings = Object.entries(resources).find(([key]) => key === lng)?.[1]?.translation;
    if (!localeStrings) throw new Error(`missing locale ${lng}`);
    expect(i18n.language).toBe(lng);
    expect(i18n.t('verseOfTheDay')).toBe(localeStrings.verseOfTheDay);
  });

  it('falls back to the English string for keys a translation bundle is missing', async () => {
    vi.stubGlobal('navigator', {
      language: 'ko-KR',
      languages: ['ko-KR', 'ko'],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    const koStrings = resources.ko.translation;
    expect(koStrings).not.toHaveProperty('versionSearchAriaLabel');
    expect(i18n.t('versionSearchAriaLabel')).toBe(en.versionSearchAriaLabel);
  });

  it('uses no strings when the browser prefers nb-NO', async () => {
    vi.stubGlobal('navigator', {
      language: 'nb-NO',
      languages: ['nb-NO', 'nb'],
    });
    vi.resetModules();

    const i18n = await loadI18n();
    const noStrings = resources.no.translation;
    expect(i18n.language).toBe('no');
    expect(i18n.t('verseOfTheDay')).toBe(noStrings.verseOfTheDay);
  });

  it('re-exports supportedLngs from generated resources', async () => {
    vi.resetModules();

    const { supportedLngs: registered } = await import('./index');
    expect(registered).toEqual(supportedLngs);
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

  it('uses an explicit host language instead of the browser preference', async () => {
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['en-US', 'en'],
    });
    vi.resetModules();

    const { default: i18n, syncUiLanguage } = await import('./index');
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          i18n.off('initialized', handler);
          resolve();
        };
        i18n.on('initialized', handler);
      });
    }

    expect(i18n.language).toBe('en');
    expect(i18n.t('verseOfTheDay')).toBe(en.verseOfTheDay);

    syncUiLanguage('es');
    await vi.waitFor(() => {
      expect(i18n.language).toBe('es');
    });
    expect(i18n.t('verseOfTheDay')).toBe(resources.es.translation.verseOfTheDay);

    syncUiLanguage('es-MX');
    await vi.waitFor(() => {
      expect(i18n.language).toBe('es');
    });
    expect(i18n.t('verseOfTheDay')).toBe(resources.es.translation.verseOfTheDay);
  });
});
