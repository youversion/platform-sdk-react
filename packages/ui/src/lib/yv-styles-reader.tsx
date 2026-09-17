import type { ReactElement } from 'react';

declare const __YV_READER_STYLES__: string;

/**
 * Bible reader typography and content rules.
 *
 * React 19 hoists this style into `<head>` and de-duplicates repeated renders
 * by `href`, so every reader can request the sheet without adding another
 * style element.
 */
export function YvReaderStyles(): ReactElement {
  return (
    <style href="yv-sdk-bible-reader" precedence="yv-sdk">
      {__YV_READER_STYLES__}
    </style>
  );
}
