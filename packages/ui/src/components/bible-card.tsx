import { usePassage, useVersion, useTheme } from '@youversion/platform-react-hooks';
import { BibleTextView } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { BibleVersionPicker } from './bible-version-picker';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { SOURCE_SERIF_FONT } from '@/lib/verse-html-utils';
import { LoaderIcon } from './icons/loader';
import { AnimatedHeight } from './animated-height';

function useDelayedLoading(loading: boolean, delay = 250): boolean {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }

    const timer = setTimeout(() => setShowSpinner(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return showSpinner;
}

type PassageResult = ReturnType<typeof usePassage>;
type VersionResult = ReturnType<typeof useVersion>;

export type BibleCardProps = {
  reference: string;
  versionId: number;
  background?: 'light' | 'dark';
  showVersionPicker?: boolean;
};

function BibleCardHeaderError(): React.ReactNode {
  return (
    <div className="yv:flex yv:flex-col yv:gap-2" role="alert" aria-live="polite">
      <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase yv:text-foreground">
        Error
      </h2>
    </div>
  );
}

function BibleCardHeaderReference({
  passage,
  version,
}: {
  passage: NonNullable<PassageResult['passage']>;
  version: VersionResult['version'];
}): React.ReactNode {
  return (
    <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase yv:text-foreground">
      {passage.reference} {version?.localized_abbreviation}
    </h2>
  );
}

function BibleCardVersionPicker({
  versionId,
  onVersionChange,
  theme,
}: {
  versionId: number;
  onVersionChange: (id: number) => void;
  theme: 'light' | 'dark';
}): React.ReactNode {
  return (
    <BibleVersionPicker.Root
      onVersionChange={onVersionChange}
      versionId={versionId}
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
            {loading ? (
              <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
            ) : (
              version?.localized_abbreviation || 'Select version'
            )}
          </Button>
        )}
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  );
}

function BibleCardFooter({ copyright }: { copyright?: string | null }): React.ReactNode {
  return (
    <div className="yv:grid yv:grid-cols-[1fr_auto] yv:gap-4 yv:items-center yv:mt-4">
      <p className="yv:text-balance yv:text-muted-foreground yv:justify-self-start yv:font-bold yv:text-[0.5rem]">
        {copyright || ''}
      </p>

      <div className="yv:justify-self-end">
        <BibleAppLogoLockup fontSize={12} />
      </div>
    </div>
  );
}

export function BibleCard({
  reference,
  versionId,
  background,
  showVersionPicker = false,
}: BibleCardProps): React.ReactNode {
  const [versionNum, setVersionNum] = useState(versionId);
  const { version } = useVersion(versionNum);
  const {
    passage,
    loading: passageLoading,
    error: passageError,
  } = usePassage({
    versionId: versionNum,
    usfm: reference,
    include_headings: true,
    include_notes: true,
  });

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const isRefetching = passageLoading && passage !== null;
  const showSpinner = useDelayedLoading(isRefetching);

  return (
    <section
      data-yv-sdk
      data-yv-theme={theme}
      className="yv:flex yv:flex-col yv:grow yv:bg-card yv:p-6 yv:max-w-md yv:rounded-2xl"
    >
      <div className="yv:flex yv:w-full yv:justify-between yv:items-center yv:h-9! yv:mb-4">
        {passage && !passageError ? (
          <div className="yv:grow yv:flex yv:items-center yv:gap-1.5">
            <BibleCardHeaderReference passage={passage} version={version} />
            {showSpinner ? (
              <LoaderIcon className="yv:size-3 yv:animate-spin yv:text-muted-foreground" />
            ) : null}
          </div>
        ) : passageError ? (
          <BibleCardHeaderError />
        ) : (
          <LoaderIcon className="yv:size-3 yv:animate-spin yv:text-muted-foreground" />
        )}

        {showVersionPicker && !passageError ? (
          <BibleCardVersionPicker
            versionId={versionNum}
            onVersionChange={setVersionNum}
            theme={theme}
          />
        ) : null}
      </div>

      <AnimatedHeight>
        <BibleTextView
          theme={theme}
          fontSize={16}
          fontFamily={SOURCE_SERIF_FONT}
          reference={reference}
          versionId={versionNum}
          passageState={{
            passage,
            loading: passageLoading,
            error: passageError,
          }}
        />
      </AnimatedHeight>

      <BibleCardFooter copyright={!passageError ? version?.copyright : null} />
    </section>
  );
}
