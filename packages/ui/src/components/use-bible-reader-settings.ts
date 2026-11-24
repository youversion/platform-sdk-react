'use client';

import { useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { getLocalStorage, setStorageItem } from '@youversion/platform-core';
import { SOURCE_SERIF_FONT, UNTITLED_SERIF_FONT, type FontFamily } from '@/lib/verse-html-utils';
import {
  BIBLE_READER_FONT,
  BIBLE_READER_SPACING,
  normalizeReaderFontSizeForInitialization,
} from './bible-reader-settings';
import { READER_STORAGE_KEYS } from './bible-reader-storage';
import type { BibleReaderSettingsProps } from './bible-reader.types';

type BibleReaderSettings = {
  currentFontSize: number;
  setCurrentFontSize: Dispatch<SetStateAction<number>>;
  currentFontFamily: FontFamily;
  setCurrentFontFamily: Dispatch<SetStateAction<FontFamily>>;
  currentLineSpacing: number;
  setCurrentLineSpacing: Dispatch<SetStateAction<number>>;
};

/**
 * Initializes and persists reader typography. An on-change callback opts a setting
 * into host control; pass its value prop to keep Radix state controlled. Saved
 * values hydrate once in a layout effect before paint, and only uncontrolled
 * settings are persisted.
 * @internal
 */
export function useBibleReaderSettings({
  fontSize: fontSizeProp,
  defaultFontSize = BIBLE_READER_FONT.DEFAULT,
  onFontSizeChange,
  fontFamily: fontFamilyProp,
  defaultFontFamily = UNTITLED_SERIF_FONT,
  onFontFamilyChange,
  lineSpacing: lineSpacingProp,
  defaultLineSpacing,
  onChangeLineSpacing,
  lineHeight,
}: BibleReaderSettingsProps): BibleReaderSettings {
  const isFontSizeControlled = onFontSizeChange !== undefined;
  const isFontFamilyControlled = onFontFamilyChange !== undefined;
  const isLineSpacingControlled = onChangeLineSpacing !== undefined;

  const defaultPropFontSize = normalizeReaderFontSizeForInitialization(
    fontSizeProp ?? defaultFontSize,
  );

  const [currentFontSize, setCurrentFontSize] = useControllableState({
    prop: isFontSizeControlled ? fontSizeProp : undefined,
    defaultProp: defaultPropFontSize,
    onChange: onFontSizeChange,
  });

  const defaultPropFontFamily = fontFamilyProp ?? defaultFontFamily;

  const [currentFontFamily, setCurrentFontFamily] = useControllableState({
    prop: isFontFamilyControlled ? fontFamilyProp : undefined,
    defaultProp: defaultPropFontFamily,
    onChange: onFontFamilyChange,
  });

  const resolvedDefaultLineSpacing =
    defaultLineSpacing ?? lineHeight ?? BIBLE_READER_SPACING.DEFAULT;

  const [currentLineSpacing, setCurrentLineSpacing] = useControllableState({
    prop: isLineSpacingControlled ? lineSpacingProp : undefined,
    defaultProp: resolvedDefaultLineSpacing,
    onChange: onChangeLineSpacing,
  });

  const didHydrateThemeSettingsRef = useRef(false);

  useLayoutEffect(() => {
    if (didHydrateThemeSettingsRef.current) return;
    didHydrateThemeSettingsRef.current = true;

    if (!isFontSizeControlled) {
      const savedFontSize = getLocalStorage()?.getItem(READER_STORAGE_KEYS.fontSize);
      if (savedFontSize) {
        const parsed = parseInt(savedFontSize);
        if (parsed >= BIBLE_READER_FONT.MIN && parsed <= BIBLE_READER_FONT.MAX) {
          setCurrentFontSize(parsed);
        }
      }
    }

    if (!isFontFamilyControlled) {
      const savedFontFamily = getLocalStorage()?.getItem(READER_STORAGE_KEYS.fontFamily);
      if (savedFontFamily) {
        // Readers who picked serif before Untitled Serif shipped stored the old
        // stack; map it forward so the picker still shows serif as active.
        // Deliberately not full validation — `FontFamily` is open on purpose, so
        // a host-supplied `defaultFontFamily="Georgia"` must still round-trip.
        setCurrentFontFamily(
          savedFontFamily === SOURCE_SERIF_FONT ? UNTITLED_SERIF_FONT : savedFontFamily,
        );
      }
    }

    if (!isLineSpacingControlled) {
      const savedLineSpacing = getLocalStorage()?.getItem(READER_STORAGE_KEYS.lineSpacing);
      if (savedLineSpacing) {
        const parsed = parseFloat(savedLineSpacing);
        if (Object.values(BIBLE_READER_SPACING).some((spacing) => spacing === parsed)) {
          setCurrentLineSpacing(parsed);
        }
      }
    }
  }, [
    isFontFamilyControlled,
    isFontSizeControlled,
    setCurrentFontFamily,
    setCurrentFontSize,
    isLineSpacingControlled,
    setCurrentLineSpacing,
  ]);

  useEffect(() => {
    if (!isFontSizeControlled) {
      setStorageItem(getLocalStorage(), READER_STORAGE_KEYS.fontSize, currentFontSize.toString());
    }
  }, [currentFontSize, isFontSizeControlled]);

  useEffect(() => {
    if (!isFontFamilyControlled) {
      setStorageItem(getLocalStorage(), READER_STORAGE_KEYS.fontFamily, currentFontFamily);
    }
  }, [currentFontFamily, isFontFamilyControlled]);

  useEffect(() => {
    if (!isLineSpacingControlled) {
      setStorageItem(
        getLocalStorage(),
        READER_STORAGE_KEYS.lineSpacing,
        currentLineSpacing.toString(),
      );
    }
  }, [currentLineSpacing, isLineSpacingControlled]);

  return {
    currentFontSize,
    setCurrentFontSize,
    currentFontFamily,
    setCurrentFontFamily,
    currentLineSpacing,
    setCurrentLineSpacing,
  };
}
