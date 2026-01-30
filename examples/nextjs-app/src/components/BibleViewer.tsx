'use client';

import { BibleTextView } from '@youversion/platform-react-ui';

export default function Home() {
  return (
    <BibleTextView reference="JHN.1" versionId={111} fontFamily="Source Serif" fontSize={18} />
  );
}
