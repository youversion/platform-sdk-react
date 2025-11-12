/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The project token for the Chromatic project. */
  readonly CHROMATIC_PROJECT_TOKEN: string;
  /** The app ID for the YouVersion platform. @see https://developers.youversion.com */
  readonly STORYBOOK_YOUVERSION_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
