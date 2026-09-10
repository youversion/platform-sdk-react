type LocaleListener = (languageTag?: string) => void;

let requested = false;
let pending: string | undefined;
const listeners = new Set<LocaleListener>();

/**
 * Records the SDK UI language without importing i18next or locale JSON.
 * YouVersionProvider calls this. The full i18n module loads catalogs when it
 * is imported by a translating component.
 */
export function requestSdkLanguage(languageTag?: string): void {
  requested = true;
  pending = languageTag;
  for (const listener of listeners) {
    listener(languageTag);
  }
}

export type RequestedSdkLanguage = {
  requested: boolean;
  languageTag?: string;
};

export function getRequestedSdkLanguage(): RequestedSdkLanguage {
  return { requested, languageTag: pending };
}

export function subscribeSdkLanguage(listener: LocaleListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
