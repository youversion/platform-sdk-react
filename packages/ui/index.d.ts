/// <reference types="vite/client" />

declare const __YV_STORYBOOK_VITEST__: boolean;

interface ImportMetaEnv {
  readonly STORYBOOK_YOUVERSION_APP_KEY?: string;
  readonly STORYBOOK_AUTH_REDIRECT_URL?: string;
  /** The YouVersion API host. @default api.youversion.com */
  readonly STORYBOOK_YOUVERSION_API_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
