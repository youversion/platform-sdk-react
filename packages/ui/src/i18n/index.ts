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
 * Applies bundled UI copy for `lng` when the host provides one (BCP-47, e.g.
 * `es` or `es-MX`). When omitted, follows `navigator.languages`.
 *
 * Call from YouVersionProvider — do not rely on module-load detection, which
 * runs in Node during bundling/dep optimization and locks to fallbackLng.
 */
export function syncUiLanguage(lng?: string): void {
  const trimmed = lng?.trim();
  const detected = resolveBrowserLanguage(
    trimmed ? [trimmed] : getBrowserLanguages(),
    supportedLngs,
    fallbackLng,
  );
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
