import { BibleReader } from '@youversion/platform-react-ui';

export function BibleReaderPage() {
  const defaultLanguageId = import.meta.env.VITE_YVP_DEFAULT_LANGUAGE_ID?.trim() || undefined;

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <BibleReader.Root
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
