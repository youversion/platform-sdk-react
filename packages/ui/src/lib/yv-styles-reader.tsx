import type { ReactElement } from 'react';

declare const __YV_READER_STYLES__: string;

export function YvReaderStyles(): ReactElement {
  return (
    <style href="yv-sdk-bible-reader" precedence="yv-sdk">
      {__YV_READER_STYLES__}
    </style>
  );
}
