/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YVP_APP_KEY?: string;
  readonly VITE_YVP_API_HOST?: string;
  readonly VITE_YVP_AUTH_REDIRECT_URL?: string;
  readonly VITE_YVP_LOCALE?: string;
  readonly VITE_YVP_DEFAULT_LANGUAGE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
