'use client';

import { BibleTextView } from '@youversion/platform-react-ui';

export default function BibleChapter(): React.ReactElement {
  return (
    <main className="p-6">
      <BibleTextView reference="JHN.1" versionId={3034} />
    </main>
  );
}
