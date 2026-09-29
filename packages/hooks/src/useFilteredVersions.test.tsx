import { renderHook } from '@testing-library/react';
import type { BibleVersion } from '@youversion/platform-core';
import { expect, it } from 'vitest';
import { useFilteredVersions } from './useFilteredVersions';

type FilterProps = {
  search: string;
  language: string;
  recentVersions: Pick<BibleVersion, 'id' | 'title' | 'localized_abbreviation'>[] | undefined;
};

function version(
  id: number,
  title: string,
  localizedTitle: string,
  abbreviation: string,
  languageTag: string,
): BibleVersion {
  return {
    id,
    title,
    localized_title: localizedTitle,
    abbreviation,
    localized_abbreviation: abbreviation,
    language_tag: languageTag,
    books: [],
    youversion_deep_link: `https://www.bible.com/versions/${id}`,
  };
}

it('combines case-insensitive search and language filters, excludes recents, and sorts results', () => {
  const versions = [
    version(1, 'Zulu Bible', 'Zulu Bible', 'ZUL', 'en'),
    version(2, 'Word Source', 'Alpha Bible', 'CODE', 'en'),
    version(3, 'Word Spanish', 'Beta Bible', 'SPAN', 'es'),
    version(4, 'Word Recent', 'Gamma Bible', 'REC', 'en'),
  ];
  const recent = [{ id: 4, title: 'Word Recent', localized_abbreviation: 'REC' }];
  const { result, rerender } = renderHook<BibleVersion[], FilterProps>(
    ({ search, language, recentVersions }: FilterProps) =>
      useFilteredVersions(versions, search, language, recentVersions),
    {
      initialProps: { search: 'WORD', language: 'EN', recentVersions: recent },
    },
  );

  expect(result.current.map(({ id }) => id)).toEqual([2]);

  rerender({ search: 'code', language: '*', recentVersions: recent });
  expect(result.current.map(({ id }) => id)).toEqual([2]);

  rerender({ search: '', language: '*', recentVersions: undefined });
  expect(result.current.map(({ id }) => id)).toEqual([2, 3, 4, 1]);
});
