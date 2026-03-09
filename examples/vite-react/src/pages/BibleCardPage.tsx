import { BibleCard } from '@youversion/platform-react-ui';

export function BibleCardPage() {
  return (
    <div className="flex justify-center p-6 md:p-12">
      <BibleCard reference="JHN.3.16" versionId={3034} showVersionPicker />
    </div>
  );
}
