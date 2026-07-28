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

/**
 * Upstream `zh.json` is Traditional Chinese. These BCP-47 tags may select it.
 * Simplified (zh-CN, zh-Hans, …) and bare `zh` must not — they fall back until a
 * Simplified bundle exists.
 */
const TRADITIONAL_CHINESE_TO_ZH = new Set(['zh-hant', 'zh-tw', 'zh-hk', 'zh-mo']);

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
    const match = matchBrowserLanguageTag(browserLang, supportedLower);
    if (match) {
      return match;
    }
  }

  return fallbackLng;
}

function matchBrowserLanguageTag(
  browserLang: string,
  supportedLower: Map<string, string>,
): string | undefined {
  const parts = browserLang.toLowerCase().split('-').filter(Boolean);

  // Progressive BCP-47 parent lookup: zh-Hant-TW → zh-Hant → zh
  for (let len = parts.length; len >= 1; len -= 1) {
    const candidate = parts.slice(0, len).join('-');

    if (TRADITIONAL_CHINESE_TO_ZH.has(candidate)) {
      const zh = supportedLower.get('zh');
      if (zh) {
        return zh;
      }
    }

    const direct = supportedLower.get(candidate);
    if (!direct) {
      continue;
    }

    // Bare "zh" is ambiguous; do not select the Traditional-only upstream bundle.
    if (candidate === 'zh') {
      continue;
    }

    return direct;
  }

  return undefined;
}
