/**
 * @vitest-environment jsdom
 */
/**
 * Every exported component carries `data-yv-sdk` on its root.
 *
 * The whole style-isolation fix keys on that attribute. SDK utilities apply only
 * inside `[data-yv-sdk]`. A component without the attribute thus loses all of
 * its styling. That failure is quiet, because the component still renders. A
 * test catches it. A review convention does not.
 *
 * The list of cases is compared with `./index.ts` itself. A new export without a
 * new case here fails the suite, and the suite does not skip it.
 */
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { BibleBook, BiblePassage, BibleVersion, Language } from '@youversion/platform-core';

// Radix Popover (through @floating-ui/dom) and VersionAbbreviationIcon both
// observe element size. jsdom has no ResizeObserver.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// jsdom on this Node version refuses localStorage for an opaque origin
// (`SecurityError`). BibleReader.Root and the version picker both read
// localStorage on mount. The suite thus gets an in-memory replacement.
const memoryStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    get length() {
      return memoryStore.size;
    },
    clear: () => memoryStore.clear(),
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, String(value));
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
    key: (index: number) => [...memoryStore.keys()][index] ?? null,
  } satisfies Storage,
});

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

// Only the data hooks are mocked. `useTheme` and the providers stay real,
// because the attribute under test comes from the resolved theme. A mocked
// provider hides a regression in that path.
vi.mock('@youversion/platform-react-hooks', async () => {
  const actual = await vi.importActual('@youversion/platform-react-hooks');
  return {
    ...actual,
    useBooks: vi.fn(),
    useFilteredVersions: vi.fn(),
    useHighlights: vi.fn(),
    useLanguage: vi.fn(),
    useLanguages: vi.fn(),
    useOrganizations: vi.fn(),
    usePassage: vi.fn(),
    useVerseOfTheDay: vi.fn(),
    useVersion: vi.fn(),
    useVersions: vi.fn(),
    useYVAuth: vi.fn(),
  };
});

import {
  useBooks,
  useFilteredVersions,
  useHighlights,
  useLanguage,
  useLanguages,
  useOrganizations,
  usePassage,
  useVerseOfTheDay,
  useVersion,
  useVersions,
  useYVAuth,
} from '@youversion/platform-react-hooks';
import { YouVersionProvider } from './YouVersionProvider';
import * as componentExports from './index';
import {
  BibleCard,
  BibleChapterPicker,
  BibleLanguagePickerContent,
  BibleReader,
  BibleTextView,
  BibleThemeSettingsContent,
  BibleVersionPicker,
  BibleVersionPickerLanguageTrigger,
  FootnoteContent,
  ProfileAvatar,
  Separator,
  Textarea,
  VerseActionPopover,
  VerseOfTheDay,
  YouVersionAuthButton,
} from './index';

const mockBooks: BibleBook[] = [
  {
    id: 'JHN',
    title: 'John',
    full_title: 'The Gospel According to John',
    canon: 'new_testament',
    abbreviation: 'John',
    chapters: [{ id: '1', title: '1', passage_id: 'JHN.1' }],
  },
];

const mockVersion = {
  id: 111,
  localized_abbreviation: 'NIV',
  abbreviation: 'NIV',
  title: 'New International Version',
  language_tag: 'en',
} as BibleVersion;

const mockPassage: BiblePassage = {
  id: 'JHN.1',
  content:
    '<div><div class="p"><span class="yv-v" v="1"></span>' +
    '<span class="yv-vlbl">1</span>In the beginning was the Word.</div></div>',
  reference: 'John 1',
};

const mockLanguage = {
  id: 'en',
  language: 'English',
  display_names: { en: 'English' },
} as Language;

function setupHookMocks(): void {
  vi.mocked(useBooks).mockReturnValue({
    books: { data: [...mockBooks], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useVersion).mockReturnValue({
    version: mockVersion,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useVersions).mockReturnValue({
    versions: { data: [mockVersion], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(usePassage).mockReturnValue({
    passage: mockPassage,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useVerseOfTheDay).mockReturnValue({
    data: { day: 1, passage_id: 'JHN.1.1' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useHighlights).mockReturnValue({
    highlights: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
    createHighlight: vi.fn(),
    deleteHighlight: vi.fn(),
  });
  vi.mocked(useLanguage).mockReturnValue({
    language: mockLanguage,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useLanguages).mockReturnValue({
    languages: { data: [mockLanguage], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useFilteredVersions).mockReturnValue([mockVersion]);
  vi.mocked(useOrganizations).mockReturnValue({ organizations: new Map() });
  vi.mocked(useYVAuth).mockReturnValue({
    auth: {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      accessToken: null,
      result: null,
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    processCallback: vi.fn(),
    userInfo: null,
  });
}

const noop = () => {};

/** Props that satisfy `VerseActionPopover`, with no test of its behavior. */
const verseActionPopoverProps = {
  open: true,
  onOpenChange: noop,
  activeHighlights: new Set<string>(),
  selectedVerses: [1],
  highlightedVerses: {},
  anchorElement: null,
  onHighlight: noop,
  onClearHighlight: noop,
  onCopy: noop,
  onShare: noop,
};

type RenderCase = {
  render: () => ReactElement;
  /**
   * Where the root of the component lands. The default is the first element in
   * the render container. A portalled component mounts to `document.body`, so
   * that case names its root by a selector.
   */
  rootSelector?: string;
};

/**
 * One case per exported component. A compound export renders the sub-component
 * that owns the root element. A component that needs a context renders inside
 * the provider that supplies the context.
 */
const RENDER_CASES: Record<string, RenderCase> = {
  BibleCard: {
    render: () => <BibleCard reference="JHN.1.1" versionId={111} />,
  },
  BibleChapterPicker: {
    render: () => (
      <BibleChapterPicker.Root
        book="JHN"
        onBookChange={noop}
        chapter="1"
        onChapterChange={noop}
        versionId={111}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>
    ),
  },
  BibleLanguagePickerContent: {
    render: () => (
      <BibleVersionPicker.Root versionId={111} onVersionChange={noop}>
        <BibleLanguagePickerContent open />
      </BibleVersionPicker.Root>
    ),
  },
  BibleReader: {
    render: () => (
      <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Content />
      </BibleReader.Root>
    ),
  },
  BibleTextView: {
    render: () => <BibleTextView reference="JHN.1" versionId={111} />,
  },
  BibleThemeSettingsContent: {
    render: () => (
      <BibleThemeSettingsContent
        theme="light"
        fontSize={16}
        fontFamily="inter"
        lineSpacing={1.7}
        onFontSelected={noop}
        onFontIncreased={noop}
        onFontDecreased={noop}
        onChangeLineSpacing={noop}
      />
    ),
  },
  BibleVersionPicker: {
    render: () => (
      <BibleVersionPicker.Root versionId={111} onVersionChange={noop}>
        <BibleVersionPicker.Trigger />
      </BibleVersionPicker.Root>
    ),
  },
  BibleVersionPickerLanguageTrigger: {
    render: () => (
      <BibleVersionPicker.Root versionId={111} onVersionChange={noop}>
        <BibleVersionPickerLanguageTrigger />
      </BibleVersionPicker.Root>
    ),
  },
  FootnoteContent: {
    render: () => (
      <FootnoteContent
        verseNum="1"
        reference="John 1:1"
        notes={['A note.']}
        verseHtml="<span>In the beginning was the Word.</span>"
      />
    ),
  },
  ProfileAvatar: {
    render: () => <ProfileAvatar name="Cam Anderson" />,
  },
  Separator: {
    render: () => <Separator />,
  },
  Textarea: {
    render: () => <Textarea />,
  },
  VerseActionPopover: {
    render: () => <VerseActionPopover {...verseActionPopoverProps} />,
    // Radix renders the content into document.body, so the container is empty.
    rootSelector: '[role="dialog"]',
  },
  VerseOfTheDay: {
    render: () => <VerseOfTheDay versionId={111} />,
  },
  YouVersionAuthButton: {
    render: () => <YouVersionAuthButton mode="signIn" />,
  },
};

/**
 * Value exports that are not components. This list is written by hand, and not
 * detected. A new component with a name that looks like a helper name thus still
 * fails the coverage check below.
 */
const NON_COMPONENT_EXPORTS = new Set([
  'BIBLE_READER_FONT',
  'HIGHLIGHT_COLORS',
  'clampBibleReaderFontSize',
  'createBibleThemeSettingsContentHandlers',
  'nextBibleReaderFontSizeDown',
  'nextBibleReaderFontSizeUp',
]);

describe('scope attribute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memoryStore.clear();
    setupHookMocks();
  });

  it('covers every value export from ./index.ts', () => {
    const uncovered = Object.keys(componentExports).filter(
      (name) => !(name in RENDER_CASES) && !NON_COMPONENT_EXPORTS.has(name),
    );

    expect(
      uncovered,
      'A new export needs a RENDER_CASES entry (component) or a NON_COMPONENT_EXPORTS entry (helper).',
    ).toEqual([]);
  });

  it('has no RENDER_CASES entry for an export that no longer exists', () => {
    const stale = Object.keys(RENDER_CASES).filter((name) => !(name in componentExports));

    expect(stale).toEqual([]);
  });

  it.each(Object.keys(RENDER_CASES))('%s stamps data-yv-sdk on its root', (name) => {
    const testCase = RENDER_CASES[name];
    if (!testCase) throw new Error(`No render case for ${name}`);

    const { container } = render(
      <YouVersionProvider appKey="test-app-key">{testCase.render()}</YouVersionProvider>,
    );

    const root = testCase.rootSelector
      ? document.body.querySelector(testCase.rootSelector)
      : container.firstElementChild;

    expect(root, `${name} rendered nothing to assert on`).not.toBeNull();
    expect(root).toHaveAttribute('data-yv-sdk');
    // The token block on `[data-yv-sdk]` declares the light `--yv-*` values
    // again. A gated element inside a dark scope must thus restate its theme,
    // or it returns to light without a warning.
    expect(root).toHaveAttribute('data-yv-theme');
  });
});
