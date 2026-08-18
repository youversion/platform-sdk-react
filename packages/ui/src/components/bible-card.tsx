import { usePassage, useVersion, useTheme } from '@youversion/platform-react-hooks';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION, type Highlight } from '@youversion/platform-core';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { BibleTextView, type FootnoteData } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { BibleVersionPicker, type BibleVersionPickerPressData } from './bible-version-picker';
import { Button } from './ui/button';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { UNTITLED_SERIF_FONT } from '@/lib/verse-html-utils';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import { LoaderIcon } from './icons/loader';
import { AnimatedHeight } from './animated-height';

type PassageResult = ReturnType<typeof usePassage>;
type VersionResult = ReturnType<typeof useVersion>;

export type BibleCardProps = {
  reference: string;
  versionId?: number;
  defaultVersionId?: number;
  onVersionChange?: (versionId: number) => void;
  background?: 'light' | 'dark';
  showVersionPicker?: boolean;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onFootnotePress?: (data: FootnoteData) => void;
  /**
   * When provided (including `[]`), paints these highlights on the card
   * (controlled mode, no fetch). Use for React Native or Expo DOM hosts that
   * already own highlight data — pass `[]` while loading or signed out so the
   * WebView does not fetch.
   *
   * Omit the prop for Swift-like self-contained paint: when the user is signed
   * in, has granted the `highlights` permission, and highlights are live, the
   * card fetches and paints matching verses. A first render of `undefined`
   * latches self-contained (fetch when eligible). Mode is latched at first
   * mount.
   */
  highlights?: Highlight[];
};

/**
 * The "Error" label for the header slot.
 *
 * It matches `BibleCardHeaderReference` exactly. The card already renders an
 * `<h2>` in this slot for the passage reference, so this injects no new heading
 * level into the host page's outline. It carries no `role="alert"` and no
 * `aria-live`: the body block stays the single alert region, so screen readers
 * announce one alert.
 */
function BibleCardHeaderError(): React.ReactNode {
  const { t } = useTranslation(undefined, { i18n });
  return (
    <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase yv:text-foreground">
      {t('errorHeading')}
    </h2>
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
  onVersionPickerPress,
}: {
  versionId: number;
  onVersionChange: (id: number) => void;
  theme: 'light' | 'dark';
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
}): React.ReactNode {
  const { t } = useTranslation(undefined, { i18n });
  return (
    <BibleVersionPicker.Root
      onVersionChange={onVersionChange}
      versionId={versionId}
      background={theme}
      onVersionPickerPress={onVersionPickerPress}
    >
      <BibleVersionPicker.Trigger aria-label={t('changeBibleVersionAriaLabel')}>
        {({ version, loading }) => (
          <Button
            variant="secondary"
            className="yv:font-bold yv:text-xs"
            disabled={loading}
            data-yv-theme={theme}
          >
            {loading ? (
              <LoaderIcon className="yv:size-4 yv:animate-spin" aria-hidden="true" />
            ) : (
              version?.localized_abbreviation || t('selectVersion')
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
  versionId: controlledVersionId,
  defaultVersionId = DEFAULT_LICENSE_FREE_BIBLE_VERSION,
  onVersionChange,
  background,
  showVersionPicker = false,
  onVersionPickerPress,
  onFootnotePress,
  highlights,
}: BibleCardProps): React.ReactNode {
  // Controlled only when both versionId + onVersionChange are provided.
  // versionId alone seeds uncontrolled state, preserving backwards compatibility
  // with consumers who use the version picker without an onChange handler.
  const isControlled = controlledVersionId !== undefined && onVersionChange !== undefined;

  const [versionNum, setVersionNum] = useControllableState({
    prop: isControlled ? controlledVersionId : undefined,
    defaultProp: isControlled ? defaultVersionId : (controlledVersionId ?? defaultVersionId),
    onChange: onVersionChange,
  });
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
      className="yv:w-full yv:flex yv:flex-col yv:grow yv:bg-card yv:p-6 yv:rounded-2xl yv:box-border"
    >
      <div className="yv:card-content">
        <div className="yv:flex yv:w-full yv:justify-between yv:items-center yv:mb-4">
          {/*
            The error branch stays separate rather than folding into the loading
            branch, which would spin forever on error.
          */}
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

          {/*
            The picker stays available during an error. A 404 means the passage
            is not in the selected version, so switching versions is the fix.
          */}
          {showVersionPicker ? (
            <BibleCardVersionPicker
              versionId={versionNum}
              onVersionChange={setVersionNum}
              theme={theme}
              onVersionPickerPress={onVersionPickerPress}
            />
          ) : null}
        </div>

        <AnimatedHeight>
          <BibleTextView
            theme={theme}
            fontSize={16}
            fontFamily={UNTITLED_SERIF_FONT}
            reference={reference}
            versionId={versionNum}
            showVerseNumbers={false}
            passageState={{
              passage,
              loading: passageLoading,
              error: passageError,
            }}
            onFootnotePress={onFootnotePress}
            highlights={highlights}
          />
        </AnimatedHeight>

        <BibleCardFooter copyright={!passageError ? version?.copyright : null} />
      </div>
    </section>
  );
}
