import { useContext } from 'react';
import {
  VerseSelectionContext,
  type VerseSelectionContextData,
} from './context/VerseSelectionContext';

/**
 * @deprecated This hook will be removed in the next major version.
 */
export function useVerseSelection(): VerseSelectionContextData {
  const context = useContext(VerseSelectionContext);
  if (!context) {
    throw new Error('useVerseSelection must be used within a VerseSelectionProvider');
  }
  return context;
}
