'use client';

import { BibleReader } from '@youversion/platform-react-ui';
import { AuthButton } from '@/components/AuthDemo';
import { VerseDisplay } from '@/components/VerseDisplay';
import { BibleTextView } from '@youversion/platform-react-ui';

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen gap-4 p-4">
      <div className="flex-1 overflow-hidden border rounded">
        <BibleReader.Root defaultVersionId={3034} defaultBook="GEN" defaultChapter="1">
          <BibleReader.Content />
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </div>
    </div>
  );
}
