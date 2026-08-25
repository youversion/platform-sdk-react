import {
  usePassage,
  useVersion,
  useTheme,
  type UsePassageResult,
  type UseVersionResult,
} from '@youversion/platform-react-hooks';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION, type Highlight } from '@youversion/platform-core';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import type { BibleVersionPickerPressData } from './bible-version-picker';
import type { FootnoteData } from './verse';

export type BibleCardProps = {
  reference: string;
  versionId?: number;
  defaultVersionId?: number;
  onVersionChange?: (versionId: number) => void;
  background?: 'light' | 'dark';
  showVersionPicker?: boolean;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onFootnotePress?: (data: FootnoteData) => void;
  /**
   * When provided (including `[]`), paints these highlights on the card
   * (controlled mode, no fetch). Use for React Native or Expo DOM hosts that
   * already own highlight data — pass `[]` while loading or signed out so the
   * WebView does not fetch.
   *
   * Omit the prop for self-contained paint: when the user is signed
   * in, has granted the `highlights` permission, and highlights are live, the
   * card fetches and paints matching verses. A first render of `undefined`
   * latches self-contained (fetch when eligible). Mode is latched at first
   * mount.
   *
   * Verse and range `reference`s clip host and fetched rows to that USFM, so a
   * highlight that runs past the card does not paint extra verses. Chapter-scope
   * references paint the whole chapter.
   */
  highlights?: Highlight[];
  /**
   * Caps the painted `<section>` shell. A number is CSS pixels. `'100%'` fills
   * the parent (Come and See / full-bleed) and keeps the 600px inner column.
   * Omit for 700. Full-bleed hosts must pass `'100%'`.
   * The section lifts the Bible renderer `65ch` measure so scripture fills
   * that inner column.
   */
  maxWidth?: number | '100%';
};

export const BIBLE_CARD_DEFAULT_MAX_WIDTH_PX = 700;

export type BibleCardModel = {
  reference: string;
  versionNum: number;
  setVersionNum: (id: number) => void;
  version: UseVersionResult['version'];
  passage: UsePassageResult['passage'];
  passageLoading: UsePassageResult['loading'];
  passageError: UsePassageResult['error'];
  theme: 'light' | 'dark';
  showSpinner: boolean;
  onFootnotePress: BibleCardProps['onFootnotePress'];
  highlights: BibleCardProps['highlights'];
  maxWidth: number | '100%';
};

export function useBibleCardModel({
  reference,
  versionId: controlledVersionId,
  defaultVersionId = DEFAULT_LICENSE_FREE_BIBLE_VERSION,
  onVersionChange,
  background,
  onFootnotePress,
  highlights,
  maxWidth = BIBLE_CARD_DEFAULT_MAX_WIDTH_PX,
}: BibleCardProps): BibleCardModel {
  // Controlled only when both versionId + onVersionChange are provided.
  // versionId alone seeds uncontrolled state, preserving backwards compatibility
  // with consumers who use the version picker without an onChange handler.
  const isControlled = controlledVersionId !== undefined && onVersionChange !== undefined;

  const [versionNum, setVersionNum] = useControllableState({
    prop: isControlled ? controlledVersionId : undefined,
    defaultProp: isControlled ? defaultVersionId : (controlledVersionId ?? defaultVersionId),
    onChange: onVersionChange,
  });
  const { version } = useVersion(versionNum);
  const {
    passage,
    loading: passageLoading,
    error: passageError,
  } = usePassage({
    versionId: versionNum,
    usfm: reference,
    include_headings: true,
    include_notes: true,
  });

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const isRefetching = passageLoading && passage !== null;
  const showSpinner = useDelayedLoading(isRefetching);

  return {
    reference,
    versionNum,
    setVersionNum,
    version,
    passage,
    passageLoading,
    passageError,
    theme,
    showSpinner,
    onFootnotePress,
    highlights,
    maxWidth,
  };
}
