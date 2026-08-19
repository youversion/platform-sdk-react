import type {
  BibleVersion,
  GetHighlightsOptions,
  GetLanguagesOptions,
} from '@youversion/platform-core';
import type { UseApiDataOptions } from './useApiData';
import type { UseBooksResult } from './useBooks';
import type { UseHighlightsResult } from './useHighlights';
import type { UseLanguageResult } from './useLanguage';
import type { UseLanguagesResult } from './useLanguages';
import type { UseOrganizationsResult } from './useOrganizations';
import type { UsePassageProps, UsePassageResult } from './usePassage';
import type { UseVersionResult } from './useVersion';
import type { UseVersionsOptions, UseVersionsResult } from './useVersions';
import type { UseVerseOfTheDayResult } from './useVOTD';

/**
 * Test-only replacements for data hooks. When a key is set, that hook returns
 * the override and does not call the rest of its body. Keep the override
 * present for the whole mount; do not add or remove it between renders.
 */
export type HookOverrides = {
  useBooks?: (versionId: number, options?: UseApiDataOptions) => UseBooksResult;
  useFilteredVersions?: (
    versions: BibleVersion[],
    searchTerm: string,
    selectedLanguage: string,
    recentVersions?: Pick<BibleVersion, 'id' | 'title' | 'localized_abbreviation'>[],
  ) => BibleVersion[];
  useHighlights?: (
    options: GetHighlightsOptions,
    apiOptions?: UseApiDataOptions,
  ) => UseHighlightsResult;
  useLanguage?: (languageId: string, apiOptions?: UseApiDataOptions) => UseLanguageResult;
  useLanguages?: (
    options?: GetLanguagesOptions,
    apiOptions?: UseApiDataOptions,
  ) => UseLanguagesResult;
  useOrganizations?: (organizationIds: (string | null | undefined)[]) => UseOrganizationsResult;
  usePassage?: (props: UsePassageProps) => UsePassageResult;
  useTheme?: () => 'light' | 'dark';
  useVersion?: (versionId: number, options?: UseApiDataOptions) => UseVersionResult;
  useVersions?: (
    languageRanges?: string | string[],
    licenseId?: string | number,
    options?: UseVersionsOptions,
  ) => UseVersionsResult;
  useVerseOfTheDay?: (day: number, options?: UseApiDataOptions) => UseVerseOfTheDayResult;
};
