import type { FontFamily } from '@/lib/verse-html-utils';

export const BIBLE_READER_FONT = {
  MIN: 12,
  MAX: 20,
  DEFAULT: 16,
  STEP: 2,
} as const;

export const BIBLE_READER_SPACING = {
  SM: 1.45,
  DEFAULT: 1.7,
  LG: 2.0,
} as const;

const MIN_FONT_SIZE = BIBLE_READER_FONT.MIN;
const MAX_FONT_SIZE = BIBLE_READER_FONT.MAX;
const DEFAULT_FONT_SIZE = BIBLE_READER_FONT.DEFAULT;
const FONT_SIZE_STEP = BIBLE_READER_FONT.STEP;

export type BibleThemeSettingsValues = {
  fontSize: number;
  fontFamily: FontFamily;
  lineSpacing: number;
};

export type BibleThemeSettingsSnapshot = BibleThemeSettingsValues & {
  minFontSize: number;
  maxFontSize: number;
};

export type BibleThemeSettingsContentProps = {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: FontFamily;
  lineSpacing: number;
  onFontSelected: (fontFamily: FontFamily) => void;
  onFontIncreased: () => void;
  onFontDecreased: () => void;
  onChangeLineSpacing: () => void;
};

export function clampBibleReaderFontSize(fontSize: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize));
}

export function normalizeReaderFontSizeForInitialization(size: number): number {
  if (size > MAX_FONT_SIZE || size < MIN_FONT_SIZE) {
    return DEFAULT_FONT_SIZE;
  }
  return size;
}

export function nextBibleReaderFontSizeUp(current: number): number {
  return clampBibleReaderFontSize(current + FONT_SIZE_STEP);
}

export function nextBibleReaderFontSizeDown(current: number): number {
  return clampBibleReaderFontSize(current - FONT_SIZE_STEP);
}

export function changeBibleReaderLineSpacing(current: number): number {
  switch (current) {
    case BIBLE_READER_SPACING.DEFAULT:
      return BIBLE_READER_SPACING.LG;
    case BIBLE_READER_SPACING.LG:
      return BIBLE_READER_SPACING.SM;
    default:
      return BIBLE_READER_SPACING.DEFAULT;
  }
}

/**
 * Builds the handler props for `BibleThemeSettingsContent` from host-owned font state.
 * Use this on the same side as `setFontSize` / `setFontFamily` (e.g. React Native before passing
 * **top-level** props into a `BibleThemeSettingsContent` Expo DOM wrapper). Expo allows functions as
 * top-level DOM props; do not nest these inside a {@link BibleThemeSettingsSnapshot}.
 */
export function createBibleThemeSettingsContentHandlers(options: {
  getFontSize: () => number;
  getFontFamily: () => FontFamily;
  setFontSize: (size: number) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  getLineSpacing: () => number;
  setLineSpacing: (size: number) => void;
}): Pick<
  BibleThemeSettingsContentProps,
  'onFontIncreased' | 'onFontDecreased' | 'onFontSelected' | 'onChangeLineSpacing'
> {
  return {
    onFontIncreased: () => {
      options.setFontSize(nextBibleReaderFontSizeUp(options.getFontSize()));
    },
    onFontDecreased: () => {
      options.setFontSize(nextBibleReaderFontSizeDown(options.getFontSize()));
    },
    onFontSelected: (fontFamily) => {
      options.setFontFamily(fontFamily);
    },
    onChangeLineSpacing: () => {
      options.setLineSpacing(changeBibleReaderLineSpacing(options.getLineSpacing()));
    },
  };
}
