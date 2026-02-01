'use client';

import { BibleReader } from '@youversion/platform-react-ui';
import Link from 'next/link';

export default function ReaderPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b mb-10 ">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      <div className="flex-1 overflow-hidden">
        <BibleReader.Root defaultBook="JHN" defaultChapter="3" defaultVersionId={3034}>
          <BibleReader.Toolbar />
          <BibleReader.Content />
        </BibleReader.Root>
      </div>
    </div>
  );
}
