import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import * as stylex from '@stylexjs/stylex';
import i18n from '@/i18n';
import { BibleTextView } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';
import { UNTITLED_SERIF_FONT } from '@/lib/verse-html-utils';
import { LoaderIcon } from './icons/loader';
import { AnimatedHeight } from './animated-height';
import { colors } from '../lib/tokens.stylex';
import { useBibleCardModel, type BibleCardProps } from './bible-card-model';

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  section: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: colors.card,
    padding: '1.5rem',
    borderRadius: '1rem',
    boxSizing: 'border-box',
    marginInline: 'auto',
  },
  fill: {
    width: '100%',
  },
  cardContent: {
    width: '100%',
    maxWidth: 600,
    marginInline: 'auto',
  },
  header: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBlockEnd: '1rem',
  },
  headingRow: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  heading: {
    fontWeight: 700,
    letterSpacing: '0.1em',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: colors.foreground,
    fontFamily: 'var(--yv-font-sans)',
  },
  spinner: {
    width: '0.75rem',
    height: '0.75rem',
    color: colors.mutedForeground,
    animationName: spin,
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  clip: {
    overflow: 'hidden',
  },
  footer: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '1rem',
    alignItems: 'center',
    marginBlockStart: '1rem',
  },
  copyright: {
    textWrap: 'balance',
    color: colors.mutedForeground,
    justifySelf: 'start',
    fontWeight: 700,
    fontSize: '0.5rem',
    fontFamily: 'var(--yv-font-sans)',
  },
  logo: {
    justifySelf: 'end',
  },
});

type SectionStyle = CSSProperties & {
  '--yv-reader-max-width': 'none';
};

function BibleCardHeaderError(): React.ReactNode {
  const { t } = useTranslation(undefined, { i18n });
  return <h2 {...stylex.props(styles.heading)}>{t('errorHeading')}</h2>;
}

function BibleCardHeaderReference({
  passage,
  version,
}: {
  passage: NonNullable<ReturnType<typeof useBibleCardModel>['passage']>;
  version: ReturnType<typeof useBibleCardModel>['version'];
}): React.ReactNode {
  return (
    <h2 {...stylex.props(styles.heading)}>
      {passage.reference} {version?.localized_abbreviation}
    </h2>
  );
}

function BibleCardFooter({ copyright }: { copyright?: string | null }): React.ReactNode {
  return (
    <div {...stylex.props(styles.footer)}>
      <p {...stylex.props(styles.copyright)}>{copyright || ''}</p>
      <div {...stylex.props(styles.logo)}>
        <BibleAppLogoLockup fontSize={12} />
      </div>
    </div>
  );
}

/** StyleX BibleCard chrome. Picker stays on the Tailwind path. */
export function BibleCardStyleX(props: BibleCardProps): React.ReactNode {
  const {
    reference,
    versionNum,
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

  const sectionStyle: SectionStyle = {
    maxWidth: maxWidth === '100%' ? '100%' : `${maxWidth}px`,
    '--yv-reader-max-width': 'none',
  };

  return (
    <section
      data-yv-sdk
      data-yv-theme={theme}
      {...stylex.props(styles.section)}
      style={sectionStyle}
    >
      <div
        data-yv-card-content={maxWidth === '100%' ? 'column' : 'fill'}
        {...stylex.props(maxWidth === '100%' ? styles.cardContent : styles.fill)}
      >
        <div {...stylex.props(styles.header)}>
          {passage && !passageError ? (
            <div {...stylex.props(styles.headingRow)}>
              <BibleCardHeaderReference passage={passage} version={version} />
              {showSpinner ? <LoaderIcon {...stylex.props(styles.spinner)} /> : null}
            </div>
          ) : passageError ? (
            <BibleCardHeaderError />
          ) : (
            <LoaderIcon {...stylex.props(styles.spinner)} />
          )}
        </div>

        <div {...stylex.props(styles.clip)}>
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
        </div>

        <BibleCardFooter copyright={!passageError ? version?.copyright : null} />
      </div>
    </section>
  );
}
