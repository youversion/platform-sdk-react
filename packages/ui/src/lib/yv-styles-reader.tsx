import { Suspense, type ReactElement } from 'react';

declare const __YV_READER_STYLES__: string;

function YvReaderSheet(): ReactElement {
  return (
    <style href="yv-sdk-bible-reader" precedence="yv-sdk">
      {__YV_READER_STYLES__}
    </style>
  );
}

export function YvReaderStyles(): ReactElement {
  return (
    <Suspense fallback={null}>
      <YvReaderSheet />
    </Suspense>
  );
}
