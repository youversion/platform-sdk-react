import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

/**
 * @internal
 * Converts the active Bible version filter to stable text.
 *
 * The filter lives on `YouVersionPlatformConfiguration`, which `YouVersionProvider`
 * writes from its `permittedVersionIds`, `excludedVersionIds`, and
 * `permittedLanguageTags` props during render, before children read this value.
 *
 * The ids and tags are sorted before serialization, so two lists with the same
 * entries produce the same text. An unset list serializes as `null`, which keeps
 * "no filter" apart from "an empty filter list".
 *
 * `useQueryKeyBase` uses this text as a cache key segment. A provider that
 * tightens the filter after a read has been cached therefore gets a new key,
 * instead of serving content the filter now refuses.
 */
export function serializeVersionFilters(): string | null {
  const { permittedVersionIds, excludedVersionIds, permittedLanguageTags } =
    YouVersionPlatformConfiguration;

  if (
    permittedVersionIds === undefined &&
    excludedVersionIds === undefined &&
    permittedLanguageTags === undefined
  ) {
    return null;
  }

  return JSON.stringify([
    permittedVersionIds ? [...permittedVersionIds].sort((a, b) => a - b) : null,
    excludedVersionIds ? [...excludedVersionIds].sort((a, b) => a - b) : null,
    permittedLanguageTags ? [...permittedLanguageTags].sort((a, b) => a.localeCompare(b)) : null,
  ]);
}
