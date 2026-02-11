'use client';

import { BibleReader } from '@youversion/platform-react-ui';

export default function BibleReaderPage(): React.ReactElement {
  return (
    <div className="h-screen">
      <BibleReader.Root defaultBook="JHN" defaultChapter="3" defaultVersionId={3034}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  );
}
