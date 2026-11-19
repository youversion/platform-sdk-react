import {
  YouVersionProvider,
  usePassage,
  useVersions,
  type UseApiDataOptions,
  type UsePassageProps,
  type UsePassageResult,
  type UseVersionsOptions,
  type UseVersionsResult,
} from '@youversion/platform-react-ui';

export type {
  BibleSearchPhase,
  BibleSearchResult,
  UseBibleSearchProps,
  UseBibleSearchResult,
  UseBookResult,
  UseBooksResult,
  UseChapterResult,
  UseChaptersResult,
  UseHighlightsResult,
  UseLanguageResult,
  UseLanguagesResult,
  UseOrganizationResult,
  UseOrganizationsResult,
  UseUnifiedSearchProps,
  UseUnifiedSearchResult,
  UseVerseResult,
  UseVerseOfTheDayResult,
  UseVersesResult,
  UseVersionResult,
} from '@youversion/platform-react-ui';

const options: UseApiDataOptions = { enabled: true, keepPreviousData: false };
const passageProps: UsePassageProps = {
  versionId: 3034,
  usfm: 'JHN.3.16',
  format: 'text',
  options,
};
const versionsOptions: UseVersionsOptions = { ...options, page_size: 10, fields: ['id', 'title'] };

function Passage() {
  const { passage }: UsePassageResult = usePassage(passageProps);
  const { versions }: UseVersionsResult = useVersions('en', undefined, versionsOptions);
  // @ts-expect-error The public options must not degrade to any through a re-export.
  usePassage({ versionId: '3034', usfm: 'JHN.3.16' });
  // @ts-expect-error The public result must preserve BiblePassage's content type.
  const content: number = passage?.content;
  // @ts-expect-error The public result must preserve the collection's BibleVersion type.
  const title: number = versions?.data[0]?.title;
  return (
    <p>
      {passage?.content} ({versions?.data.length})
    </p>
  );
}

export const app = (
  <YouVersionProvider appKey="consumer-key">
    <Passage />
  </YouVersionProvider>
);
