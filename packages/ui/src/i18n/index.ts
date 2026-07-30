import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getBrowserLanguages, resolveBrowserLanguage } from './detectLanguage';
import { resources, supportedLngs } from './resources.generated';

export { resources, supportedLngs };


const defaultNS = 'translation';
const BRAND_NAME = 'YouVersion';
/** Used when a key/locale is missing or browser language is unsupported — not the active UI language. */
const fallbackLng = 'en';

const i18n: I18nInstance = i18next.createInstance();

/**
 * Applies the user's browser language when running in a browser.
 * Call from YouVersionProvider on mount — do not rely on module-load detection,
 * which runs in Node during bundling/dep optimization and locks to fallbackLng.
 */
export function syncBrowserLanguageFromNavigator(): void {
  const detected = resolveBrowserLanguage(getBrowserLanguages(), supportedLngs, fallbackLng);
  if (i18n.language !== detected) {
    void i18n.changeLanguage(detected);
  }
}

function getInitialLanguage(): string {
  if (typeof navigator === 'undefined') {
    return fallbackLng;
  }
  return resolveBrowserLanguage(getBrowserLanguages(), supportedLngs, fallbackLng);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    lng: getInitialLanguage(),
    supportedLngs,
    fallbackLng,
    interpolation: {
      escapeValue: false, // React already escapes
      defaultVariables: {
        brandName: BRAND_NAME,
      },
    },
  })
  .catch((err: unknown) => {
    console.error('[youversion-sdk] i18n initialization failed:', err);
  });

export default i18n;
