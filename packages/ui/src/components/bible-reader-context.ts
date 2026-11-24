'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { BibleBook, Highlight, TextDirection } from '@youversion/platform-core';
import type { FontFamily } from '@/lib/verse-html-utils';
import type { VerseFocusRequest } from '@/lib/use-transient-verse-focus';
import type { BibleChapterPickerPressData } from './bible-chapter-picker';
import type { BibleVersionPickerPressData } from './bible-version-picker';
import type { BibleReaderSearchPressData } from './bible-reader-search';
import type { FootnoteData } from './verse';
import type { BibleReaderNavigation } from './bible-reader-navigation';
import type {
  BibleReaderHighlightIntent,
  BibleReaderShareData,
  BibleReaderVerseSelection,
} from './bible-reader.types';

export type BibleReaderContextType = {
  book: string;
  chapter: string;
  versionId: number;
  setBook: Dispatch<SetStateAction<string>>;
  setChapter: Dispatch<SetStateAction<string>>;
  setVersionId: Dispatch<SetStateAction<number>>;
  booksData: BibleBook[];
  booksLoading: boolean;
  currentFontFamily: FontFamily;
  setCurrentFontFamily: Dispatch<SetStateAction<FontFamily>>;
  currentFontSize: number;
  setCurrentFontSize: Dispatch<SetStateAction<number>>;
  currentLineSpacing: number;
  setCurrentLineSpacing: Dispatch<SetStateAction<number>>;
  showVerseNumbers: boolean;
  background: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onSearchPress?: (data: BibleReaderSearchPressData) => void | Promise<void>;
  languageId?: string;
  defaultLanguageId?: string;
  onLanguageChange?: (languageId: string) => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  onCopy?: (data: BibleReaderShareData) => void | Promise<void>;
  onShare?: (data: BibleReaderShareData) => void | Promise<void>;
  highlights?: Highlight[];
  isHighlightsControlled: boolean;
  onVerseSelect?: (selection: BibleReaderVerseSelection) => void;
  onHighlightApply?: (intent: BibleReaderHighlightIntent) => void;
  onHighlightRemove?: (intent: BibleReaderHighlightIntent) => void;
  verseActions: 'popover' | 'none';
  clearSelectionSignal?: number;
  navigation: BibleReaderNavigation;
  verseFocus: VerseFocusRequest | null;
  scriptureDirection?: TextDirection;
};

export const BibleReaderContext = createContext<BibleReaderContextType | null>(null);

export function useBibleReaderContext(): BibleReaderContextType {
  const context = useContext(BibleReaderContext);
  if (!context) {
    throw new Error('BibleReader components must be used within BibleReader.Root');
  }
  return context;
}
