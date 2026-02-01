'use client';

import { BibleTextView } from '@youversion/platform-react-ui';

export default function BibleViewer() {
  return (
    <BibleTextView reference="JHN.1" versionId={3034} fontFamily="Source Serif" fontSize={18} />
  );
}
