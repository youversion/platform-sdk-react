import {
  type BibleReaderNavigation,
  type BibleReaderReference,
} from '@youversion/platform-react-ui';

export const SAMPLE_BIBLE_VERSION_ID = 3034;

export type ReaderCommand =
  | {
      readonly kind: 'show-passage';
      readonly passageId: string;
      readonly versionId: number;
      readonly showsFullChapter: boolean;
    }
  | {
      readonly kind: 'focus-passage';
      readonly passageId: string;
      readonly versionId: number;
    };

export function applyReaderCommand(
  navigation: BibleReaderNavigation,
  command: ReaderCommand,
): void {
  const reference: BibleReaderReference = {
    passageId: command.passageId,
    versionId: command.versionId,
  };
  if (command.kind === 'show-passage') {
    navigation.request(reference, command.showsFullChapter);
    return;
  }
  navigation.focusReference(reference);
}
