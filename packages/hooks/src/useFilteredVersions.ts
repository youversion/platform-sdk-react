'use client';

import type { BibleVersion } from '@youversion/platform-core';
import { useMemo } from 'react';
import { getISOFromVersion } from './utility/version';
import { useHookOverride } from './useHookOverride';

function getVersionSortTitle(version: BibleVersion): string {
  return version.localized_title || version.title;
}

function compareVersionsAlphabetically(a: BibleVersion, b: BibleVersion): number {
  const byTitle = getVersionSortTitle(a).localeCompare(getVersionSortTitle(b), 'en', {
    sensitivity: 'base',
  });
  return byTitle !== 0 ? byTitle : a.id - b.id;
}

/**
 * Custom hook to filter versions based on search term
 */
export function useFilteredVersions(
  versions: BibleVersion[],
  searchTerm: string,
  selectedLanguage: string,
  recentVersions?: Pick<BibleVersion, 'id' | 'title' | 'localized_abbreviation'>[],
): BibleVersion[] {
  const override = useHookOverride('useFilteredVersions');
  const filtered = useMemo(() => {
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

    result.sort(compareVersionsAlphabetically);

    return result;
  }, [versions, recentVersions, searchTerm, selectedLanguage]);

  if (override) return override(versions, searchTerm, selectedLanguage, recentVersions);
  return filtered;
}
