import type { ReactElement } from 'react';

declare const __YV_COMPONENT_STYLES__: string;

/** Utilities for scripture, pickers, auth, and popovers. Not on Provider-only. */
export function YvComponentStyles(): ReactElement {
  return (
    <style href="yv-sdk-components" precedence="yv-sdk">
      {__YV_COMPONENT_STYLES__}
    </style>
  );
}
