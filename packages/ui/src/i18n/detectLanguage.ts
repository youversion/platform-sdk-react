/**
 * Reads browser language preferences when running in a browser environment.
 * Returns undefined during SSR or other non-browser contexts.
 */
export function getBrowserLanguages(): readonly string[] | undefined {
  if (!globalThis.window) {
    return undefined;
  }

  if (globalThis.navigator.languages && globalThis.navigator.languages.length > 0) {
    return globalThis.navigator.languages;
  }

  if (globalThis.navigator.language) {
    return [globalThis.navigator.language];
  }

  return undefined;
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
  }

  return fallbackLng;
}
