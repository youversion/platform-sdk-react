/**
 * Reads browser language preferences when running in a browser environment.
 * Returns undefined during SSR or other non-browser contexts.
 */
export function getBrowserLanguages(): readonly string[] | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  if (navigator.languages && navigator.languages.length > 0) {
    return navigator.languages;
  }

  if (navigator.language) {
    return [navigator.language];
  }

  return undefined;
}

/** BCP 47 bases that map to a different supported locale code. */
const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  nb: 'no',
  nn: 'no',
};

/**
 * Maps browser language tags to a supported locale code.
 * Prefers the first matching language in the user's preference list.
 */
export function resolveBrowserLanguage(
  browserLanguages: readonly string[] | undefined,
  supportedLngs: readonly string[],
  fallbackLng: string,
): string {
  if (!browserLanguages?.length) {
    return fallbackLng;
  }

  const supportedLower = new Map(supportedLngs.map((lng) => [lng.toLowerCase(), lng] as const));

  for (const browserLang of browserLanguages) {
    const lower = browserLang.toLowerCase();
    const exactMatch = supportedLower.get(lower);
    if (exactMatch) {
      return exactMatch;
    }

    const base = lower.split('-')[0];
    if (!base) {
      continue;
    }

    const baseMatch = supportedLower.get(base);
    if (baseMatch) {
      return baseMatch;
    }

    const alias = LANGUAGE_ALIASES[base];
    if (alias) {
      const aliasMatch = supportedLower.get(alias);
      if (aliasMatch) {
        return aliasMatch;
      }
    }
  }

  return fallbackLng;
}
