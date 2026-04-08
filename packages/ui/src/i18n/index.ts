import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

const defaultNS = 'translation';

export const resources = {
  en: { [defaultNS]: en },
} as const;

const i18n: I18nInstance = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources,
  defaultNS,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
