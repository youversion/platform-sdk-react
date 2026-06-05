import React, { type ComponentProps, useEffect } from 'react';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { syncBrowserLanguageFromNavigator } from '@/i18n';
import { YvStyles } from '@/lib/yv-styles';

export function YouVersionProvider(
  props: ComponentProps<typeof BaseYouVersionProvider>,
): React.ReactElement {
  useEffect(() => {
    syncBrowserLanguageFromNavigator();
  }, []);

  return (
    <BaseYouVersionProvider {...props}>
      <YvStyles />
      {props.children}
    </BaseYouVersionProvider>
  );
}
