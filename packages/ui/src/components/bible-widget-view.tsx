import { usePassage, useVersion, useTheme } from '@youversion/platform-react-hooks';
import { BibleTextView } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { BibleVersionPicker } from './bible-version-picker';
import { Button } from './ui/button';
import { useState } from 'react';
import { SOURCE_SERIF_FONT } from '@/lib/verse-html-utils';

export type BibleWidgetViewProps = {
  reference: string;
  versionId: number;
  background?: 'light' | 'dark';
  showVersionPicker?: boolean;
};
export function BibleWidgetView({
  reference,
  versionId,
  background,
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
  const providerTheme = useTheme();
  const theme = background || providerTheme;

  return (
    <section
      data-yv-sdk
      data-yv-theme={theme}
      className="yv:flex yv:flex-col yv:bg-card yv:p-6 yv:max-w-md yv:rounded-2xl"
    >
      <div className="yv:flex yv:justify-between yv:items-center">
        {passage?.reference ? (
          <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase yv:text-foreground">
            {passage.reference} {version?.localized_abbreviation}
          </h2>
        ) : null}

        {showVersionPicker ? (
          <BibleVersionPicker.Root
            onVersionChange={setVersionNum}
            versionId={versionNum}
            background={theme}
          >
            <BibleVersionPicker.Trigger aria-label="Change Bible version">
              {({ version, loading }) => (
                <Button
                  variant="secondary"
                  className="yv:font-bold yv:text-xs"
                  disabled={loading}
                  data-yv-theme={theme}
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
        theme={theme}
        fontSize={16}
        fontFamily={SOURCE_SERIF_FONT}
        reference={reference}
        versionId={versionNum}
      />

      <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-4 yv:items-center yv:mt-4">
        <div className="yv:text-balance yv:text-muted-foreground yv:justify-self-start yv:font-bold yv:text-[0.5rem]">
          {version?.copyright}
        </div>

        <div className="yv:justify-self-end">
          <BibleAppLogoLockup fontSize={12} />
        </div>
      </div>
    </section>
  );
}
