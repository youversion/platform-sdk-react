'use client';

import { useState } from 'react';
import { BibleChapterPicker } from '@youversion/platform-react-ui';

export default function ChapterPicker(): React.ReactNode {
  const [background, setBackground] = useState<'light' | 'dark'>('light');
  const [book, setBook] = useState('GEN');
  const [chapter, setChapter] = useState<string>('1');
  const [versionId, setVersionId] = useState<number>(1);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="background" className="text-sm font-medium">
            Background:
          </label>
          <select
            id="background"
            value={background}
            onChange={(e) => setBackground(e.target.value as 'light' | 'dark')}
            className="px-3 py-2 border rounded"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="book" className="text-sm font-medium">
            Book:
          </label>
          <input
            id="book"
            type="text"
            value={book}
            onChange={(e) => setBook(e.target.value)}
            className="px-3 py-2 border rounded"
            placeholder="e.g., GEN, MAT"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="chapter" className="text-sm font-medium">
            Chapter:
          </label>
          <input
            id="chapter"
            type="number"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            min="1"
            className="px-3 py-2 border rounded"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="versionId" className="text-sm font-medium">
            Version ID:
          </label>
          <input
            id="versionId"
            type="number"
            value={versionId}
            onChange={(e) => setVersionId(Number(e.target.value))}
            min="1"
            className="px-3 py-2 border rounded"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <BibleChapterPicker.Root
          key={`${background}-${book}-${chapter}-${versionId}`}
          background={background}
          book={book}
          onBookChange={setBook}
          chapter={chapter.toString()}
          onChapterChange={setChapter}
          versionId={versionId}
        >
          <BibleChapterPicker.Trigger />
        </BibleChapterPicker.Root>
      </div>
    </div>
  );
}
