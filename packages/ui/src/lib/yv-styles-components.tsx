import type { ReactElement } from 'react';
import { useShadowStylesProvided } from './shadow-root-host';

declare const __YV_COMPONENT_STYLES__: string;

/**
 * Utilities for scripture, pickers, auth, and popovers. Not on Provider-only.
 *
 * React 19 hoists this style into `<head>` and de-duplicates repeated light-DOM
 * renders by `href`. Automatic shadow roots already provide this sheet.
 */
export function YvComponentStyles(): ReactElement | null {
  if (useShadowStylesProvided()) return null;

  return (
    <style href="yv-sdk-components" precedence="yv-sdk">
      {__YV_COMPONENT_STYLES__}
    </style>
  );
}
