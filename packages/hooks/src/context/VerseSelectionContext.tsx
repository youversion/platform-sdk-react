import { createContext } from 'react';

/**
 * @deprecated VerseSelectionContextData will be removed in the next major version.
 */
export type VerseSelectionContextData = {
  selectedVerseUsfms: Set<string>;
  toggleVerse: (usfm: string) => void;
  isSelected: (usfm: string) => boolean;
  clearSelection: () => void;
  selectedCount: number;
};

/**
 * @deprecated No replacement needed. Remove usage. Will be removed in the next major version.
 */
export const VerseSelectionContext = createContext<VerseSelectionContextData | null>(null);
