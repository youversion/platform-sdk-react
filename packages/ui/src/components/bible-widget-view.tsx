import { usePassage, useVersion } from "@youversion/platform-react-hooks";
import { BibleTextView } from "./verse";
import { BibleAppLogoLockup } from "./bible-app-logo-lockup";

type BibleWidgetViewProps = {
  reference: string;
  versionId: number;
  background?: "light" | "dark";
};
export function BibleWidgetView({
  reference,
  versionId,
  background = "light",
}: BibleWidgetViewProps): React.ReactNode {
  const { version } = useVersion(versionId);
  const { passage } = usePassage({
    versionId,
    usfm: reference,
    include_headings: true,
    include_notes: true,
  });

  return (
    <div
      data-yv-sdk
      data-yv-theme={background === "dark" ? "dark" : "light"}
      className="yv:flex yv:flex-col yv: yv:mx-auto yv:w-1/2 yv:bg-background yv:p-6 yv:rounded-[8px]"
    >
      <section>
        <div>
          <h2 className="yv:font-bold yv:tracking-widest yv:text-xs yv:uppercase">
            {passage?.human_reference} {version?.local_abbreviation}
          </h2>
        </div>
      </section>
      <section className="[&[data-yv-theme='dark']]:yv:text-foreground">
        <BibleTextView
          fontSize={16}
          fontFamily={"'Source Serif Pro', serif"}
          reference={reference}
          versionId={versionId}
        />
      </section>
      <section className="yv:flex yv:justify-between yv:items-center yv:mt-8">
        <div className="yv:w-1/2 yv:font-bold yv:text-[9px]">
          {version?.copyright_short}
        </div>
        <BibleAppLogoLockup fontSize={12} />
      </section>
    </div>
  );
}
