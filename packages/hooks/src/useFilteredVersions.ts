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

    return result;
  }, [versions, searchTerm, selectedLanguage]);
}
