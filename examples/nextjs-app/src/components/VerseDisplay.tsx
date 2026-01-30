'use client';

import { VerseOfTheDay } from '@youversion/platform-react-ui';

export function VerseDisplay() {
  return (
    <div className="p-6 border rounded">
      <h2 className="text-xl font-bold mb-4">Verse of the Day</h2>
      <VerseOfTheDay versionId={111} />
    </div>
  );
}
