import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

/**
 * Whether a language tag survives {@link YouVersionPlatformConfiguration.permittedLanguageTags}.
 *
 * Internal to the version filters: language lists are a projection of the
 * surviving versions, so this is the same rule applied to a language row.
 * `undefined` permits everything; an empty array permits nothing; a missing
 * tag can never match an active allowlist.
 */
export function isLanguageTagPermitted(languageTag?: string): boolean {
  const permittedLanguageTags = YouVersionPlatformConfiguration.permittedLanguageTags;
  if (permittedLanguageTags === undefined) {
    return true;
  }
  return languageTag !== undefined && permittedLanguageTags.includes(languageTag);
}

/**
 * Whether a Bible version survives the configured version filters.
 *
 * Semantics match the Swift SDK exactly:
 * - `excludedVersionIds` is checked first and beats permission.
 * - `permittedLanguageTags` and `permittedVersionIds` are ANDed.
 * - `undefined` means unrestricted; an **empty array permits nothing**.
 * - A version with no language tag fails an active language-tag filter.
 *
 * The filters describe what the SDK *offers*, so only list endpoints consult
 * this (see ADR-0005). Fetching or rendering a version by id is never blocked.
 *
 * @param versionId The Bible version id.
 * @param languageTag The version's BCP-47 language tag, when known.
 */
export function isVersionPermitted(versionId: number, languageTag?: string): boolean {
  if (YouVersionPlatformConfiguration.excludedVersionIds?.includes(versionId)) {
    return false;
  }

  if (!isLanguageTagPermitted(languageTag)) {
    return false;
  }

  const permittedVersionIds = YouVersionPlatformConfiguration.permittedVersionIds;
  if (permittedVersionIds !== undefined && !permittedVersionIds.includes(versionId)) {
    return false;
  }

  return true;
}
