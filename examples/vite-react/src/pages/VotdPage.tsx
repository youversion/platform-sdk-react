import { VerseOfTheDay } from '@youversion/platform-react-ui';

export function VotdPage() {
  return (
    <div className="flex flex-col grow items-center gap-8 w-full p-6 md:p-12">
      <VerseOfTheDay size="default" versionId={3034} />
      <VerseOfTheDay size="lg" versionId={3034} />
    </div>
  );
}
