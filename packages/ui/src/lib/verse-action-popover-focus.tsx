'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';

const VerseActionPopoverFocusRestoreContext = createContext<Element | null>(null);

export function VerseActionPopoverFocusRestoreProvider({
  target,
  children,
}: {
  target: Element | null;
  children: ReactNode;
}): ReactElement {
  return (
    <VerseActionPopoverFocusRestoreContext.Provider value={target}>
      {children}
    </VerseActionPopoverFocusRestoreContext.Provider>
  );
}

export function useVerseActionPopoverFocusRestoreTarget(): Element | null {
  return useContext(VerseActionPopoverFocusRestoreContext);
}
