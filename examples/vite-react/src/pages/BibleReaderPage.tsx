import { BibleReader, type BibleReaderReference } from '@youversion/platform-react-ui';
import { BookmarkPlus } from 'lucide-react';
import { useState } from 'react';

function markerKey({ versionId, passageId }: BibleReaderReference): string {
  return `${versionId}:${passageId}`;
}

export function BibleReaderPage() {
  const defaultLanguageId = import.meta.env.VITE_YVP_DEFAULT_LANGUAGE_ID?.trim() || undefined;
  const [markers, setMarkers] = useState(() => new Set(['3034:JHN.1.3']));
  const [openedMarker, setOpenedMarker] = useState<string>();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <p role="status" className="px-4 py-1 text-sm text-muted-foreground">
        {openedMarker
          ? `Opened marker for ${openedMarker}.`
          : 'Select verses and choose Mark verses to add a marker.'}
      </p>
      <div className="min-h-0 flex-1">
        <BibleReader.Root
          defaultBook="JHN"
          defaultChapter="1"
          defaultVersionId={3034}
          defaultLanguageId={defaultLanguageId}
          verseActionItems={[
            'highlights',
            {
              id: 'mark',
              label: 'Mark verses',
              icon: <BookmarkPlus size={20} />,
              onSelect: ({ versionId, passageIds }) =>
                setMarkers(
                  (existing) =>
                    new Set([
                      ...existing,
                      ...passageIds.map((passageId) => markerKey({ versionId, passageId })),
                    ]),
                ),
            },
            'copy',
            'share',
          ]}
          getVerseIndicator={(reference) =>
            markers.has(markerKey(reference))
              ? {
                  label: `Open marker for ${reference.passageId}`,
                  style: { backgroundColor: '#a855f7' },
                }
              : undefined
          }
          onVerseIndicatorPress={({ passageId }) => setOpenedMarker(passageId)}
        >
          <BibleReader.Content />
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </div>
    </div>
  );
}
