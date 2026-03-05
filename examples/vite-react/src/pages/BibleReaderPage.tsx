import { BibleReader } from '@youversion/platform-react-ui';

export function BibleReaderPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={3034}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  );
}
