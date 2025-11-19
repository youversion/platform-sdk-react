import { usePassage, useVersion } from '@youversion/platform-react-hooks';
import { BibleTextView } from './verse';
import { BibleAppLogoLockup } from './bible-app-logo-lockup';

export type BibleWidgetViewProps = {
  reference: string;
  versionId: number;
  background?: 'light' | 'dark';
};
export function BibleWidgetView({
  reference,
  versionId,
  background = 'light',
}: BibleWidgetViewProps): React.ReactNode {
  const { version } = useVersion(versionId);
  const { passage } = usePassage({
    versionId,
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
      {passage?.human_reference ? (
        <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase">
          {passage.human_reference} {version?.local_abbreviation}
        </h2>
      ) : null}

      <BibleTextView
        fontSize={16}
        fontFamily={"'Source Serif Pro', serif"}
        reference={reference}
        versionId={versionId}
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
