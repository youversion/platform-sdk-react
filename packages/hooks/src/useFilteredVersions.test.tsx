import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { BibleVersion } from '@youversion/platform-core';
import { useFilteredVersions } from './useFilteredVersions';

const mockVersions: BibleVersion[] = [
  {
    id: 1,
    title: 'King James Version',
    abbreviation: 'KJV',
    copyright: '',
    promotional_content: '',
    info: null,
    publisher_url: null,
    language_tag: 'en',
    localized_abbreviation: 'KJV',
    localized_title: 'King James Version',
    books: [],
    youversion_deep_link: 'https://www.bible.com/versions/1',
  },
  {
    id: 2,
    title: 'New International Version',
    abbreviation: 'NIV',
    copyright: '',
    promotional_content: '',
    info: null,
    publisher_url: null,
    language_tag: 'en',
    localized_abbreviation: 'NIV',
    localized_title: 'New International Version',
    books: [],
    youversion_deep_link: 'https://www.bible.com/versions/2',
  },
  {
    id: 3,
    title: 'Reina-Valera 1960',
    abbreviation: 'RVR1960',
    copyright: '',
    promotional_content: '',
    info: null,
    publisher_url: null,
    language_tag: 'es',
    localized_abbreviation: 'RVR1960',
    localized_title: 'Reina-Valera 1960',
    books: [],
    youversion_deep_link: 'https://www.bible.com/versions/3',
  },
  {
    id: 4,
    title: 'Nueva Versión Internacional',
    abbreviation: 'NVI',
    copyright: '',
    promotional_content: '',
    info: null,
    publisher_url: null,
    language_tag: 'es',
    localized_abbreviation: 'NVI',
    localized_title: 'Nueva Versión Internacional',
    books: [],
    youversion_deep_link: 'https://www.bible.com/versions/4',
  },
  {
    id: 5,
    title: 'La Bible du Semeur',
    abbreviation: 'BDS',
    copyright: '',
    promotional_content: '',
    info: null,
    publisher_url: null,
    language_tag: 'fr',
    localized_abbreviation: 'BDS',
    localized_title: 'La Bible du Semeur',
    books: [],
    youversion_deep_link: 'https://www.bible.com/versions/5',
  },
];

describe('useFilteredVersions', () => {
  describe('language filtering', () => {
    it('should return all versions when language is "*"', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', '*'));

      expect(result.current).toEqual(mockVersions);
      expect(result.current).toHaveLength(5);
    });

    it('should filter versions by language_tag', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', 'en'));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((v) => v.language_tag === 'en')).toBe(true);
    });

    it('should filter versions by language_tag (Spanish)', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', 'es'));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((v) => v.language_tag === 'es')).toBe(true);
    });

    it('should handle case-insensitive language matching', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', 'EN'));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((v) => v.language_tag === 'en')).toBe(true);
    });

    it('should return empty array when language matches no versions', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', 'de'));

      expect(result.current).toEqual([]);
    });
  });

  describe('search term filtering', () => {
    it('should return all versions when search term is empty', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', '*'));

      expect(result.current).toEqual(mockVersions);
    });

    it('should return all versions when search term is whitespace only', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '   ', '*'));

      expect(result.current).toEqual(mockVersions);
    });

    it('should filter by title', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'King', '*'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.title).toBe('King James Version');
    });

    it('should filter by abbreviation', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'NIV', '*'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.abbreviation).toBe('NIV');
    });

    it('should filter by language_tag', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'fr', '*'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.language_tag).toBe('fr');
    });

    it('should be case-insensitive', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'KING', '*'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.title).toBe('King James Version');
    });

    it('should find partial matches', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'Version', '*'));

      expect(result.current).toHaveLength(2);
      expect(result.current[0]?.title).toBe('King James Version');
      expect(result.current[1]?.title).toBe('New International Version');
    });

    it('should return empty array when no matches found', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'xyz', '*'));

      expect(result.current).toEqual([]);
    });
  });

  describe('combined filtering', () => {
    it('should filter by both language and search term', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'International', 'en'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.abbreviation).toBe('NIV');
      expect(result.current[0]?.language_tag).toBe('en');
    });

    it('should return empty array when language matches but search term does not', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'Reina', 'en'));

      expect(result.current).toEqual([]);
    });

    it('should return empty array when search term matches but language does not', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'King', 'es'));

      expect(result.current).toEqual([]);
    });

    it('should filter Spanish versions by search term', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, 'Reina', 'es'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.abbreviation).toBe('RVR1960');
    });
  });

  describe('recent versions exclusion', () => {
    it('should not exclude any versions when recentVersions is undefined', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', '*', undefined));

      expect(result.current).toEqual(mockVersions);
      expect(result.current).toHaveLength(5);
    });

    it('should exclude recent versions from the results', () => {
      const recentVersions = [
        { id: 1, title: 'King James Version', localized_abbreviation: 'KJV' },
      ];

      const { result } = renderHook(() =>
        useFilteredVersions(mockVersions, '', '*', recentVersions),
      );

      expect(result.current).toHaveLength(4);
      expect(result.current.find((v) => v.id === 1)).toBeUndefined();
    });

    it('should exclude multiple recent versions from the results', () => {
      const recentVersions = [
        { id: 1, title: 'King James Version', localized_abbreviation: 'KJV' },
        { id: 2, title: 'New International Version', localized_abbreviation: 'NIV' },
      ];

      const { result } = renderHook(() =>
        useFilteredVersions(mockVersions, '', '*', recentVersions),
      );

      expect(result.current).toHaveLength(3);
      expect(result.current.find((v) => v.id === 1)).toBeUndefined();
      expect(result.current.find((v) => v.id === 2)).toBeUndefined();
    });

    it('should not exclude any versions when recentVersions is empty array', () => {
      const { result } = renderHook(() => useFilteredVersions(mockVersions, '', '*', []));

      expect(result.current).toEqual(mockVersions);
      expect(result.current).toHaveLength(5);
    });

    it('should exclude recent versions even when they match search term', () => {
      const recentVersions = [
        { id: 2, title: 'New International Version', localized_abbreviation: 'NIV' },
      ];

      const { result } = renderHook(() =>
        useFilteredVersions(mockVersions, 'Version', '*', recentVersions),
      );

      // "Version" matches KJV and NIV, but NIV is excluded as a recent version
      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.title).toBe('King James Version');
    });
  });

  describe('memoization', () => {
    it('should return the same reference when inputs do not change', () => {
      const { result, rerender } = renderHook(
        ({ versions, searchTerm, language }) => useFilteredVersions(versions, searchTerm, language),
        {
          initialProps: {
            versions: mockVersions,
            searchTerm: 'King',
            language: 'en',
          },
        },
      );

      const firstResult = result.current;

      rerender({
        versions: mockVersions,
        searchTerm: 'King',
        language: 'en',
      });

      expect(result.current).toBe(firstResult);
    });

    it('should return a new reference when inputs change', () => {
      const { result, rerender } = renderHook(
        ({ versions, searchTerm, language }) => useFilteredVersions(versions, searchTerm, language),
        {
          initialProps: {
            versions: mockVersions,
            searchTerm: 'King',
            language: 'en',
          },
        },
      );

      const firstResult = result.current;

      rerender({
        versions: mockVersions,
        searchTerm: 'International',
        language: 'en',
      });

      expect(result.current).not.toBe(firstResult);
    });
  });
});
