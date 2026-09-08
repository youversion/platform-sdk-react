import { Suspense, type ReactElement } from 'react';

declare const __YV_STYLES__: string;

function YvChromeSheet(): ReactElement {
  return (
    <style href="yv-sdk-styles" precedence="yv-sdk">
      {__YV_STYLES__}
    </style>
  );
}

export function YvStyles(): ReactElement {
  return (
    <Suspense fallback={null}>
      <YvChromeSheet />
    </Suspense>
  );
}
