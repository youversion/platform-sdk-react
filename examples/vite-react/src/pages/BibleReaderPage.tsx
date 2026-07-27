import { BibleReader } from '@youversion/platform-react-ui';

export function BibleReaderPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)]">
      {/*
        `enableHighlights` is the opt-in for server-backed highlights. Without
        it the reader shows no color swatch row, makes no highlight requests,
        and can never redirect for sign-in or consent. It needs the auth-enabled
        provider configured in ThemedApp.tsx (`includeAuth` + `authRedirectUrl`).
      */}
      <BibleReader.Root
        defaultBook="JHN"
        defaultChapter="1"
        defaultVersionId={3034}
        enableHighlights
      >
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  );
}
