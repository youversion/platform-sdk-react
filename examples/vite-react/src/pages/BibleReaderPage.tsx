import { BibleReader, type BibleReaderNavigation } from '@youversion/platform-react-ui';

export function BibleReaderPage({ navigation }: { navigation: BibleReaderNavigation }) {
  const defaultLanguageId = import.meta.env.VITE_YVP_DEFAULT_LANGUAGE_ID?.trim() || undefined;

  return (
    <div className="h-full min-h-0">
      <BibleReader.Root
        navigation={navigation}
        defaultBook="JHN"
        defaultChapter="1"
        defaultVersionId={3034}
        defaultLanguageId={defaultLanguageId}
      >
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  );
}
