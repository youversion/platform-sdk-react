/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The app key for the YouVersion platform. @see https://developers.youversion.com */
  readonly STORYBOOK_YOUVERSION_APP_KEY: string;
  /** The YouVersion API host. @default api.youversion.com */
  readonly STORYBOOK_YOUVERSION_API_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
