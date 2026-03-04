import { createContext } from 'react';

export type VerseSelectionContextData = {
  selectedVerseUsfms: Set<string>;
  toggleVerse: (usfm: string) => void;
  isSelected: (usfm: string) => boolean;
  clearSelection: () => void;
  selectedCount: number;
};

/**
 * @deprecated VerseSelectionContext will be removed in the next major version.
 */
export const VerseSelectionContext = createContext<VerseSelectionContextData | null>(null);
