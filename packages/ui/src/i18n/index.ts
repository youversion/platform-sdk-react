import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getBrowserLanguages, resolveBrowserLanguage } from './detectLanguage';
import { getRequestedSdkLanguage, subscribeSdkLanguage } from './pending-locale';
import { localeLoaders, resources, supportedLngs } from './resources.generated';

export { localeLoaders, resources, supportedLngs };

const defaultNS = 'translation';
const BRAND_NAME = 'YouVersion';
/** Used when a key/locale is missing or browser language is unsupported — not the active UI language. */
const fallbackLng = 'en';

const i18n: I18nInstance = i18next.createInstance();

const localeLoads = new Map<string, Promise<void>>();

function ensureLocale(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, defaultNS)) {
    return Promise.resolve();
  }
  if (!(lng in localeLoaders)) {
    return Promise.resolve();
  }
  // SAFETY: `in` checked lng against the generated lazy-locale map.
  const loader = localeLoaders[lng as keyof typeof localeLoaders];
  const pending = localeLoads.get(lng);
  if (pending) {
    return pending;
  }
  const load = loader()
    .then((mod) => {
      i18n.addResourceBundle(lng, defaultNS, mod.default, true, false);
    })
    .finally(() => {
      localeLoads.delete(lng);
    });
  localeLoads.set(lng, load);
  return load;
}

/**
 * Resolves a host-supplied or browser language tag to a bundled locale and
 * applies it to the SDK i18n instance.
 *
 * Pass a BCP-47 tag (e.g. `es-MX`) when the host owns language — React Native
 * Expo WebViews often report English in `navigator` even when the device is not.
 * Omit the tag to follow the browser, matching {@link syncBrowserLanguageFromNavigator}.
 *
 * English is in the initial graph. Other locales load on demand so a
 * Provider-only import does not download every translation file.
 *
 * YouVersionProvider records the locale via `requestSdkLanguage` so a
 * Provider-only import does not pull i18next or locale JSON. Import this
 * module from a translating component to apply that locale and load catalogs.
 *
 * Do not call this at module load. That runs in Node during bundling and
 * locks to fallbackLng.
 */
export function syncSdkLanguage(languageTag?: string): Promise<string> {
  let tags: readonly string[] | undefined;
  if (languageTag === undefined) {
    tags = getBrowserLanguages();
  } else {
    tags = [languageTag];
  }

  const detected = resolveBrowserLanguage(tags, supportedLngs, fallbackLng);
  return ensureLocale(detected).then(() => {
    if (i18n.language === detected) {
      return detected;
    }
    return i18n.changeLanguage(detected).then(() => detected);
  });
}

/**
 * Applies the user's browser language when running in a browser.
 * Call from YouVersionProvider on mount when no `locale` prop is set.
 */
export function syncBrowserLanguageFromNavigator(): void {
  void syncSdkLanguage();
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    lng: fallbackLng,
    supportedLngs: [...supportedLngs],
    fallbackLng,
    partialBundledLanguages: true,
    interpolation: {
      escapeValue: false, // React already escapes
      defaultVariables: {
        brandName: BRAND_NAME,
      },
    },
  })
  .catch((err) => {
    console.error('[youversion-sdk] i18n initialization failed:', err);
  });

subscribeSdkLanguage((languageTag) => {
  void syncSdkLanguage(languageTag);
});
const pendingLocale = getRequestedSdkLanguage();
if (pendingLocale.requested) {
  void syncSdkLanguage(pendingLocale.languageTag);
}

export default i18n;
