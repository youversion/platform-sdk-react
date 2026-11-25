import { SAMPLE_BIBLE_VERSION_ID, type ReaderCommand } from '@/reader-command';

const presets = [
  {
    label: 'John 3:16, full chapter',
    command: {
      kind: 'show-passage',
      passageId: 'JHN.3.16',
      versionId: SAMPLE_BIBLE_VERSION_ID,
      showsFullChapter: true,
    },
  },
  {
    label: 'John 3:16, focused',
    command: {
      kind: 'focus-passage',
      passageId: 'JHN.3.16',
      versionId: SAMPLE_BIBLE_VERSION_ID,
    },
  },
  {
    label: 'Psalm 118:1, focused',
    command: {
      kind: 'focus-passage',
      passageId: 'PSA.118.1',
      versionId: SAMPLE_BIBLE_VERSION_ID,
    },
  },
  {
    label: 'Psalm 119:105, full chapter',
    command: {
      kind: 'show-passage',
      passageId: 'PSA.119.105',
      versionId: SAMPLE_BIBLE_VERSION_ID,
      showsFullChapter: true,
    },
  },
  {
    label: 'Romans 8:28, verse',
    command: {
      kind: 'show-passage',
      passageId: 'ROM.8.28',
      versionId: SAMPLE_BIBLE_VERSION_ID,
      showsFullChapter: false,
    },
  },
  {
    label: 'Genesis 1, whole chapter',
    command: {
      kind: 'show-passage',
      passageId: 'GEN.1',
      versionId: SAMPLE_BIBLE_VERSION_ID,
      showsFullChapter: true,
    },
  },
] as const satisfies readonly { label: string; command: ReaderCommand }[];

export function NavigationDemoPage({
  onReadInBible,
}: {
  onReadInBible: (command: ReaderCommand) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6 md:p-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Navigation</h1>
        <p className="text-sm text-muted-foreground">
          Each item opens that passage in Bible. Browser Back returns to this demo.
        </p>
      </div>
      <ul className="overflow-hidden rounded-lg border bg-card">
        {presets.map((preset) => (
          <li key={preset.label} className="border-b last:border-b-0">
            <button
              type="button"
              className="w-full ps-4 pe-4 py-3 text-start text-sm hover:bg-accent"
              onClick={() => onReadInBible(preset.command)}
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
