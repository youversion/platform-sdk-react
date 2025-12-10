import { usePassage, useVersion } from '@youversion/platform-react-hooks';
import { BibleTextView } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { BibleVersionPicker } from './bible-version-picker';
import { Button } from './ui/button';
import { useState } from 'react';

export type BibleWidgetViewProps = {
  reference: string;
  versionId: number;
  background?: 'light' | 'dark';
  showVersionPicker?: boolean;
};
export function BibleWidgetView({
  reference,
  versionId,
  background = 'light',
  showVersionPicker = false,
}: BibleWidgetViewProps): React.ReactNode {
  const [versionNum, setVersionNum] = useState(versionId);
  const { version } = useVersion(versionNum);
  const { passage } = usePassage({
    versionId: versionNum,
    usfm: reference,
    include_headings: true,
    include_notes: true,
  });

  return (
    <section
      data-yv-sdk
      data-yv-theme={background === 'dark' ? 'dark' : 'light'}
      className="yv:flex yv:flex-col yv:bg-card yv:p-6 yv:max-w-md yv:rounded-2xl"
    >
      <div className="yv:flex yv:justify-between yv:items-center">
        {passage?.reference ? (
          <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase">
            {passage.reference} {version?.localized_abbreviation}
          </h2>
        ) : null}

        {showVersionPicker ? (
          <BibleVersionPicker.Root
            onVersionChange={setVersionNum}
            versionId={versionNum}
            background={background}
          >
            <BibleVersionPicker.Trigger aria-label="Change Bible version">
              {({ version, loading }) => (
                <Button
                  variant="secondary"
                  className="yv:font-bold yv:text-xs"
                  disabled={loading}
                  data-yv-theme={background === 'dark' ? 'dark' : 'light'}
                >
                  {loading ? 'Loading...' : version?.localized_abbreviation || 'Select version'}
                </Button>
              )}
            </BibleVersionPicker.Trigger>
            <BibleVersionPicker.Content />
          </BibleVersionPicker.Root>
        ) : null}
      </div>

      <BibleTextView
        fontSize={16}
        fontFamily={"'Source Serif Pro', serif"}
        reference={reference}
        versionId={versionNum}
      />

      <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-4 yv:items-center yv:mt-4">
        <div className="yv:text-balance yv:text-muted-foreground yv:justify-self-start yv:font-bold yv:text-[0.5rem]">
          {version?.copyright_short}
        </div>

        <div className="yv:justify-self-end">
          <BibleAppLogoLockup fontSize={12} />
        </div>
      </div>
    </section>
  );
}
