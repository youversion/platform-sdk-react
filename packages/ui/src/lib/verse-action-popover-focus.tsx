'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';

type TakeFocusRestoreTarget = () => Element | null;

const VerseActionPopoverFocusRestoreContext = createContext<TakeFocusRestoreTarget | null>(null);

/** @internal */
export function VerseActionPopoverFocusRestoreProvider({
  takeTarget,
  children,
}: {
  takeTarget: TakeFocusRestoreTarget;
  children: ReactNode;
}): ReactElement {
  return (
    <VerseActionPopoverFocusRestoreContext.Provider value={takeTarget}>
      {children}
    </VerseActionPopoverFocusRestoreContext.Provider>
  );
}

/** @internal */
export function useTakeVerseActionPopoverFocusRestoreTarget(): TakeFocusRestoreTarget | null {
  return useContext(VerseActionPopoverFocusRestoreContext);
}
