import type { ReactElement } from 'react';
import { tailwindStylesheet } from './embedded-styles';

export function YvStyles(): ReactElement {
  return (
    <style href="yv-sdk-styles" precedence="yv-sdk">
      {tailwindStylesheet}
    </style>
  );
}
