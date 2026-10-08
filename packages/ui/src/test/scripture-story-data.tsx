import type { BiblePassage, BibleVersion, Language, Organization } from '@youversion/platform-core';
import { YouVersionContext, type HookOverrides } from '@youversion/platform-react-hooks';
import { useContext, type ReactNode } from 'react';
import mockBibles from './mock-data/bibles.json';
import mockPassages from './mock-data/passages.json';

const NIV_VERSION = mockBibles.individual['111'] satisfies BibleVersion;
const AMP_VERSION = {
  ...mockBibles.individual['1588'],
  books: ['LUK'],
} satisfies BibleVersion;
const VERSIONS = [NIV_VERSION, AMP_VERSION];

const ENGLISH: Language = {
  id: 'en',
  language: 'English',
  display_names: { en: 'English' },
  speaking_population: 1_500_000_000,
};

const ORGANIZATIONS: Organization[] = [
  {
    id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
    name: 'Biblica',
  },
  {
    id: '798d8fa4-f640-4155-8cfb-fa91d1d8a06c',
    name: 'The Lockman Foundation',
  },
];

function fixtureVersion(versionId: number): BibleVersion | null {
  if (versionId === 111) return NIV_VERSION;
  if (versionId === 1588) return AMP_VERSION;
  return null;
}

function fixturePassage(versionId: number, usfm: string): BiblePassage | null {
  if (versionId === 111 && usfm === 'JHN.3.16') return mockPassages['JHN.3.16'];
  if (versionId === 111 && usfm === 'ISA.43.19') return mockPassages['ISA.43.19'];
  if (versionId === 111 && usfm === 'LUK.1.39-45') return mockPassages['LUK.1.39-45.NIV'];
  if (versionId === 1588 && usfm === 'LUK.1.39-45') return mockPassages['LUK.1.39-45.AMP'];
  return null;
}

const SCRIPTURE_STORY_OVERRIDES = {
  usePassage: ({ versionId, usfm }) => ({
    passage: fixturePassage(versionId, usfm),
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVersion: (versionId) => ({
    version: fixtureVersion(versionId),
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVersions: () => ({
    versions: { data: VERSIONS, next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVerseOfTheDay: () => ({
    data: { day: 1, passage_id: 'ISA.43.19' },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useLanguages: () => ({
    languages: { data: [ENGLISH], next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useLanguage: () => ({
    language: ENGLISH,
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useOrganizations: () => ({
    organizations: new Map(ORGANIZATIONS.map((organization) => [organization.id, organization])),
  }),
} satisfies HookOverrides;

export function ScriptureStoryDataProvider({ children }: { children: ReactNode }): ReactNode {
  const parentContext = useContext(YouVersionContext);
  const value = parentContext
    ? { ...parentContext, hookOverrides: SCRIPTURE_STORY_OVERRIDES }
    : { appKey: 'test', hookOverrides: SCRIPTURE_STORY_OVERRIDES };

  return <YouVersionContext.Provider value={value}>{children}</YouVersionContext.Provider>;
}
