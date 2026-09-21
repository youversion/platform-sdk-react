import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { BibleReader, useBibleReaderContext } from './bible-reader';
import { BibleReaderNavigation } from './bible-reader-navigation';
import { HookOverrideProvider } from '@/test/hook-overrides';
import type { HookOverrides } from '@youversion/platform-react-hooks';

function CurrentDestination() {
  const { book, chapter, versionId, verseFocus } = useBibleReaderContext();
  return (
    <output aria-label="destination">
      {JSON.stringify({ book, chapter, versionId, verseFocus })}
    </output>
  );
}

it('consumes the newest pre-mount request once and supports mounted cross-version, range and in-place focus requests', () => {
  const navigation = new BibleReaderNavigation();
  const changed = vi.fn();
  navigation.request({ versionId: 111, passageId: 'ROM.8.28' });
  navigation.request({ versionId: 3034, passageId: 'JHN.3.16-18' });
  const overrides: HookOverrides = {
    useBooks: () => ({ books: null, loading: false, error: null, refetch: () => {} }),
  };
  const jsx = (
    <StrictMode>
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root navigation={navigation} defaultVersionId={111} onVersionChange={changed}>
          <CurrentDestination />
        </BibleReader.Root>
      </HookOverrideProvider>
    </StrictMode>
  );
  const view = render(jsx);
  const destination = () =>
    JSON.parse(screen.getByRole('status', { name: 'destination' }).textContent ?? '{}');
  expect(destination()).toMatchObject({
    versionId: 3034,
    book: 'JHN',
    chapter: '3',
    verseFocus: {
      verses: [16, 17, 18],
      showsFullChapter: false,
      shouldFocus: false,
    },
  });
  expect(changed).toHaveBeenCalledTimes(1);
  act(() => navigation.focusReference({ versionId: 3034, passageId: 'JHN.3.17' }, false));
  expect(destination().verseFocus).toMatchObject({
    verses: [17],
    scrollsToVerse: false,
    shouldFocus: true,
  });
  act(() => navigation.focusReference({ versionId: 111, passageId: 'ROM.8.28' }, false));
  expect(destination()).toMatchObject({ versionId: 3034, book: 'JHN', chapter: '3' });
  act(() => navigation.focusReference({ versionId: 111, passageId: 'ROM.8.28' }));
  expect(destination()).toMatchObject({
    versionId: 111,
    book: 'ROM',
    chapter: '8',
    verseFocus: {
      verses: [28],
      showsFullChapter: true,
      scrollsToVerse: true,
      shouldFocus: true,
    },
  });
  view.unmount();
  render(jsx);
  expect(destination()).toMatchObject({
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    verseFocus: null,
  });
});

it('renders passage-only and full-chapter destinations through the reader fetch', async ({
  onTestFinished,
}) => {
  const scrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
  Element.prototype.scrollTo = vi.fn();
  onTestFinished(() => {
    Object.defineProperty(
      Element.prototype,
      'scrollTo',
      scrollTo ?? { value: undefined, configurable: true, writable: true },
    );
  });
  const navigation = new BibleReaderNavigation();
  const requested = vi.fn();
  const overrides: HookOverrides = {
    useBooks: () => ({ books: null, loading: false, error: null, refetch: () => {} }),
    useVersion: () => ({ version: null, loading: false, error: null, refetch: () => {} }),
    usePassage: (props) => {
      requested(props.versionId, props.usfm);
      return { passage: null, loading: true, error: null, refetch: () => {} };
    },
  };
  navigation.request({ versionId: 3034, passageId: 'JHN.3.16-18' });
  render(
    <StrictMode>
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root navigation={navigation} highlights={[]}>
          <BibleReader.Content />
        </BibleReader.Root>
      </HookOverrideProvider>
    </StrictMode>,
  );
  await waitFor(() => expect(requested).toHaveBeenLastCalledWith(3034, 'JHN.3.16-18'));
  expect(
    requested.mock.calls.every(
      ([version, passage]) => version === 3034 && passage === 'JHN.3.16-18',
    ),
  ).toBe(true);
  act(() => navigation.request({ versionId: 111, passageId: 'ROM.8.28' }, true));
  await waitFor(() => expect(requested).toHaveBeenLastCalledWith(111, 'ROM.8'));
});

it('waits for controlled destinations and never revives an activated passage or focus after leaving it', ({
  onTestFinished,
}) => {
  const scrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo');
  Element.prototype.scrollTo = vi.fn();
  onTestFinished(() => {
    Object.defineProperty(
      Element.prototype,
      'scrollTo',
      scrollTo ?? { value: undefined, configurable: true, writable: true },
    );
  });
  const navigation = new BibleReaderNavigation();
  navigation.request({ versionId: 3034, passageId: 'JHN.3.16' });
  const requested = vi.fn();
  const changed = vi.fn();
  const overrides: HookOverrides = {
    useBooks: () => ({ books: null, loading: false, error: null, refetch: () => {} }),
    useVersion: () => ({ version: null, loading: false, error: null, refetch: () => {} }),
    usePassage: (props) => {
      if (props.options?.enabled) requested(props.versionId, props.usfm);
      return { passage: null, loading: true, error: null, refetch: () => {} };
    },
  };
  const reader = (versionId: number, book: string, chapter: string) => (
    <StrictMode>
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root
          navigation={navigation}
          versionId={versionId}
          book={book}
          chapter={chapter}
          onVersionChange={changed}
          onBookChange={changed}
          onChapterChange={changed}
          highlights={[]}
        >
          <CurrentDestination />
          <BibleReader.Content />
        </BibleReader.Root>
      </HookOverrideProvider>
    </StrictMode>
  );
  const view = render(reader(111, 'ROM', '8'));
  const destination = () =>
    JSON.parse(screen.getByRole('status', { name: 'destination' }).textContent ?? '{}');
  expect(requested).not.toHaveBeenCalled();
  expect(changed.mock.calls).toEqual([[3034], ['JHN'], ['3']]);
  // A host can round-trip the controlled fields separately.
  view.rerender(reader(3034, 'ROM', '8'));
  expect(requested).not.toHaveBeenCalled();
  view.rerender(reader(3034, 'JHN', '3'));
  expect(requested).toHaveBeenLastCalledWith(3034, 'JHN.3.16');
  view.rerender(reader(3034, 'JHN', '4'));
  expect(destination().verseFocus).toBeNull();
  view.rerender(reader(3034, 'JHN', '3'));
  expect(requested).toHaveBeenLastCalledWith(3034, 'JHN.3');
  act(() => navigation.focusReference({ versionId: 111, passageId: 'ROM.8.28' }));
  expect(destination().verseFocus).toMatchObject({ passageId: 'ROM.8.28', shouldFocus: true });
  view.rerender(reader(111, 'JHN', '3'));
  expect(destination().verseFocus).not.toBeNull();
  view.rerender(reader(111, 'ROM', '8'));
  expect(requested).toHaveBeenLastCalledWith(111, 'ROM.8');
  view.rerender(reader(3034, 'ROM', '8'));
  expect(destination().verseFocus).toBeNull();
  view.rerender(reader(111, 'ROM', '8'));
  expect(destination().verseFocus).toBeNull();
});
