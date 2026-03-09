import { VerseOfTheDay } from '@youversion/platform-react-ui';

export function VotdPage() {
  return (
    <div className="flex justify-center p-6 md:p-12">
      <VerseOfTheDay versionId={3034} />
    </div>
  );
}
