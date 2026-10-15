import type { ReactElement } from 'react';
import { useShadowStylesProvided } from './shadow-root-host';

declare const __YV_READER_STYLES__: string;

/**
 * Bible reader typography and content rules.
 *
 * React 19 hoists this style into `<head>` and de-duplicates repeated light-DOM
 * renders by `href`. Automatic shadow roots already provide this sheet.
 */
export function YvReaderStyles(): ReactElement | null {
  if (useShadowStylesProvided()) return null;

  return (
    <style href="yv-sdk-bible-reader" precedence="yv-sdk">
      {__YV_READER_STYLES__}
    </style>
  );
}
