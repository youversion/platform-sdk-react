import type { ReactElement } from 'react';

declare const __YV_STYLES__: string;

export function YvStyles(): ReactElement {
  return (
    <style href="yv-sdk-styles" precedence="yv-sdk">
      {__YV_STYLES__}
    </style>
  );
}
