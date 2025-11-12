'use client';

import { BibleTextView } from '@youversion/platform-react-ui';

export default function BibleChapter(): React.ReactElement {
  return (
    <>
      <BibleTextView reference="JHN.1" versionId={111} />
    </>
  );
}
