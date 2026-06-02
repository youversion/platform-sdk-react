import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

const defaultNS = 'translation';
const BRAND_NAME = 'YouVersion';

export const resources = {
  en: { [defaultNS]: en },
} as const;

const i18n: I18nInstance = i18next.createInstance();

i18n
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
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
