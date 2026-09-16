import * as React from 'react';
import type { TextDirection } from '@youversion/platform-core';

// Keep this aligned with RTL locale packs in i18n/resources.generated.ts.
const RTL_LOCALES = new Set(['ar']);

export function resolveInterfaceDirection(
  direction: TextDirection | undefined,
  locale: string | undefined,
): TextDirection {
  if (direction) return direction;
  const language = locale?.trim().split('-')[0]?.toLowerCase();
  return language && RTL_LOCALES.has(language) ? 'rtl' : 'ltr';
}

const InterfaceDirectionContext = React.createContext<TextDirection>('ltr');

export function InterfaceDirectionProvider({
  direction,
  children,
}: {
  direction: TextDirection;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <InterfaceDirectionContext.Provider value={direction}>
      {children}
    </InterfaceDirectionContext.Provider>
  );
}

export function useInterfaceDirection(): TextDirection {
  return React.useContext(InterfaceDirectionContext);
}
