import { Suspense, type ReactElement } from 'react';

declare const __YV_COMPONENT_STYLES__: string;

function YvComponentSheet(): ReactElement {
  return (
    <style href="yv-sdk-components" precedence="yv-sdk">
      {__YV_COMPONENT_STYLES__}
    </style>
  );
}

/** Utilities for scripture, pickers, auth, and popovers. Not on Provider-only. */
export function YvComponentStyles(): ReactElement {
  return (
    <Suspense fallback={null}>
      <YvComponentSheet />
    </Suspense>
  );
}
