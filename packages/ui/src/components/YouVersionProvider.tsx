import React, { type ComponentProps } from 'react';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { YvStyles } from '@/lib/yv-styles';

export function YouVersionProvider(
  props: ComponentProps<typeof BaseYouVersionProvider>,
): React.ReactElement {
  return (
    <BaseYouVersionProvider {...props}>
      <YvStyles />
      {props.children}
    </BaseYouVersionProvider>
  );
}
