import type { ReactElement } from 'react';

declare const __YV_COMPONENT_STYLES__: string;

/**
 * Utilities for scripture, pickers, auth, and popovers. Not on Provider-only.
 *
 * React 19 hoists this style into `<head>` and de-duplicates repeated renders
 * by `href`, so every component can request the sheet without adding another
 * style element.
 */
export function YvComponentStyles(): ReactElement {
  return (
    <style href="yv-sdk-components" precedence="yv-sdk">
      {__YV_COMPONENT_STYLES__}
    </style>
  );
}
