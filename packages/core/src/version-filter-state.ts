/**
 * Bible version / language allowlists. `YouVersionPlatformConfiguration`
 * exposes these as public statics. Clients and query keys read this module
 * so unused auth storage stays off the `useChapter` graph.
 */
export type VersionFilterState = {
  permittedVersionIds: number[] | undefined;
  excludedVersionIds: number[] | undefined;
  permittedLanguageTags: string[] | undefined;
};

export const versionFilterState: VersionFilterState = {
  permittedVersionIds: undefined,
  excludedVersionIds: undefined,
  permittedLanguageTags: undefined,
};
