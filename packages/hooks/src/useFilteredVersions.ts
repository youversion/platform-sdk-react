'use client';

import type { BibleVersion } from '@youversion/platform-core';
import { useMemo } from 'react';
import { getISOFromVersion } from './utility/version';

/**
 * Custom hook to filter versions based on search term
 */
export function useFilteredVersions(
  versions: BibleVersion[],
  searchTerm: string,
  selectedLanguage: string,
  recentVersions?: Pick<BibleVersion, 'id' | 'title' | 'localized_abbreviation'>[],
): BibleVersion[] {
  return useMemo(() => {
    let result = [...versions];

    // Language filter
    if (selectedLanguage && selectedLanguage !== '*') {
      result = result.filter(
        (version) => getISOFromVersion(version).toLowerCase() === selectedLanguage.toLowerCase(),
      );
    }

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        (version) =>
          version.title.toLowerCase().includes(searchLower) ||
          version.abbreviation.toLowerCase().includes(searchLower) ||
          getISOFromVersion(version).toLowerCase().includes(searchLower),
      );
    }

    // Recently Used Filter
    if (recentVersions) {
      const recentVersionIds = recentVersions.map((version) => version.id);
      result = result.filter((version) => !recentVersionIds.includes(version.id));
    }

    return result;
  }, [versions, recentVersions, searchTerm, selectedLanguage]);
}
