/**
 * Reads browser language preferences when running in a browser environment.
 * Returns undefined during SSR or other non-browser contexts.
 */
export function getBrowserLanguages(): readonly string[] | undefined {
  const navigator = globalThis.navigator;
  if (!navigator) {
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

/**
 * Browser BCP 47 bases that differ from our bundle code.
 * Norwegian ships as `no` from platform-localization; browsers report `nb`/`nn`.
 */
const LANGUAGE_ALIASES = {
  nb: 'no',
  nn: 'no',
} satisfies Record<string, string>;

function localeCandidates(tag: string): readonly string[] {
  const lower = tag.toLowerCase();
  const base = lower.split('-')[0];
  if (!base) {
    return [lower];
  }
  const alias = LANGUAGE_ALIASES[base];
  return alias ? [lower, base, alias] : [lower, base];
}

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
    for (const candidate of localeCandidates(browserLang)) {
      const match = supportedLower.get(candidate);
      if (match) {
        return match;
      }
    }
  }

  return fallbackLng;
}
