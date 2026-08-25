import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { BibleTextView } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { BibleVersionPicker } from './bible-version-picker';
import { Button } from './ui/button';
import { UNTITLED_SERIF_FONT } from '@/lib/verse-html-utils';
import { LoaderIcon } from './icons/loader';
import { AnimatedHeight } from './animated-height';
import { useBibleCardModel, type BibleCardProps } from './bible-card-model';

type BibleCardSectionStyle = CSSProperties & {
  '--yv-reader-max-width': 'none';
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
  passage: NonNullable<ReturnType<typeof useBibleCardModel>['passage']>;
  version: ReturnType<typeof useBibleCardModel>['version'];
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
  onVersionPickerPress?: BibleCardProps['onVersionPickerPress'];
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

/** Tailwind BibleCard path. Picker/popover work stays here for YPE-5138. */
export function BibleCardTailwind(props: BibleCardProps): React.ReactNode {
  const {
    reference,
    versionNum,
    setVersionNum,
    version,
    passage,
    passageLoading,
    passageError,
    theme,
    showSpinner,
    onFootnotePress,
    highlights,
    maxWidth,
  } = useBibleCardModel(props);

  const sectionStyle: BibleCardSectionStyle = {
    maxWidth: maxWidth === '100%' ? '100%' : `${maxWidth}px`,
    marginInline: 'auto',
    '--yv-reader-max-width': 'none',
  };

  return (
    <section
      data-yv-sdk
      data-yv-theme={theme}
      className="yv:w-full yv:flex yv:flex-col yv:grow yv:bg-card yv:p-6 yv:rounded-2xl yv:box-border"
      style={sectionStyle}
    >
      <div className={maxWidth === '100%' ? 'yv:card-content' : 'yv:w-full'}>
        <div className="yv:flex yv:w-full yv:justify-between yv:items-center yv:mb-4">
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

          {props.showVersionPicker ? (
            <BibleCardVersionPicker
              versionId={versionNum}
              onVersionChange={setVersionNum}
              theme={theme}
              onVersionPickerPress={props.onVersionPickerPress}
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
