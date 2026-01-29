import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { BibleVersion, BibleBook, BibleChapter, BibleVerse } from '@youversion/platform-core';
import { useReaderContext } from './ReaderContext';
import { renderWithReaderProvider } from '../__tests__/utils/test-utils';
import {
  createMockBook,
  createMockChapter,
  createMockVerse,
  createMockVersion,
} from '../__tests__/mocks/bibles';

// Mock Bible data
const mockVersion = createMockVersion();
const mockBook = createMockBook();
const mockChapter = createMockChapter();
const mockVerse = createMockVerse();

// Alternative mock data for update tests
const mockVersion2 = createMockVersion({
  id: 2,
  title: 'New International Version',
  abbreviation: 'NIV',
  localized_abbreviation: 'NIV',
  localized_title: 'New International Version',
  youversion_deep_link: 'https://www.bible.com/versions/2',
});

const mockBook2 = createMockBook({
  id: 'JHN',
  title: 'John',
  full_title: 'The Gospel According to John',
  abbreviation: 'Jn',
  canon: 'new_testament',
});

const mockChapter2 = createMockChapter({
  id: '3',
  passage_id: 'JHN.3',
  title: '3',
});

const mockVerse2 = createMockVerse({
  id: '16',
  passage_id: 'JHN.3.16',
  title: '16',
});

// Helper functions to verify state
function expectReaderState(
  testId: string,
  expected: BibleVersion | BibleBook | BibleChapter | BibleVerse | null,
) {
  const element = screen.getByTestId(testId);
  const content = element.textContent ?? '';

  if (expected === null) {
    expect(content).toBe('');
  } else {
    expect(JSON.parse(content)).toMatchObject(expected);
  }
}

function expectVersion(expected: BibleVersion) {
  expectReaderState('current-version', expected);
}

function expectBook(expected: BibleBook) {
  expectReaderState('current-book', expected);
}

function expectChapter(expected: BibleChapter) {
  expectReaderState('current-chapter', expected);
}

function expectVerse(expected: BibleVerse | null) {
  expectReaderState('current-verse', expected);
}

function TestChild() {
  const {
    currentVersion,
    currentBook,
    currentChapter,
    currentVerse,
    setVersion,
    setBook,
    setChapter,
    setVerse,
  } = useReaderContext();

  return (
    <div>
      <div data-testid="current-version">{JSON.stringify(currentVersion)}</div>
      <div data-testid="current-book">{JSON.stringify(currentBook)}</div>
      <div data-testid="current-chapter">{JSON.stringify(currentChapter)}</div>
      <div data-testid="current-verse">{currentVerse ? JSON.stringify(currentVerse) : null}</div>
      <button onClick={() => setVersion(mockVersion2)} data-testid="set-version">
        Set Version
      </button>
      <button onClick={() => setBook(mockBook2)} data-testid="set-book">
        Set Book
      </button>
      <button onClick={() => setChapter(mockChapter2)} data-testid="set-chapter">
        Set Chapter
      </button>
      <button onClick={() => setVerse(mockVerse2)} data-testid="set-verse">
        Set Verse
      </button>
      <button onClick={() => setVerse(null)} data-testid="clear-verse">
        Clear Verse
      </button>
    </div>
  );
}

describe('ReaderProvider', () => {
  describe('initialization', () => {
    it('should initialize with provided version', () => {
      renderWithReaderProvider(<TestChild />);

      expectVersion(mockVersion);
    });

    it('should initialize with provided book', () => {
      renderWithReaderProvider(<TestChild />);

      expectBook(mockBook);
    });

    it('should initialize with provided chapter', () => {
      renderWithReaderProvider(<TestChild />);

      expectChapter(mockChapter);
    });

    it('should initialize with provided verse', () => {
      renderWithReaderProvider(<TestChild />);

      expectVerse(mockVerse);
    });

    it('should initialize with null verse when provided', () => {
      renderWithReaderProvider(<TestChild />, { currentVerse: null });

      expectVerse(null);
    });

    it('should throw error when useReaderContext is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => render(<TestChild />)).toThrow(
        'useReaderContext() must be used within a ReaderProvider',
      );

      consoleError.mockRestore();
    });
  });

  describe('setVersion', () => {
    it('should update version when setVersion is called', () => {
      renderWithReaderProvider(<TestChild />);

      const button = screen.getByTestId('set-version');
      act(() => {
        button.click();
      });

      expectVersion(mockVersion2);
    });

    it('should update version in consumers when setVersion is called', () => {
      renderWithReaderProvider(<TestChild />);

      act(() => screen.getByTestId('set-version').click());

      expect(screen.getByTestId('current-version')).toHaveTextContent('NIV');
    });
  });

  describe('setBook', () => {
    it('should update book when setBook is called', () => {
      renderWithReaderProvider(<TestChild />);

      const button = screen.getByTestId('set-book');
      act(() => {
        button.click();
      });

      expectBook(mockBook2);
    });

    it('should trigger re-render in consumers when book changes', () => {
      renderWithReaderProvider(<TestChild />);

      const bookBefore = screen.getByTestId('current-book');
      const bookBeforeContent = bookBefore.textContent;

      const button = screen.getByTestId('set-book');
      act(() => {
        button.click();
      });

      const bookAfter = screen.getByTestId('current-book');
      expect(bookAfter.textContent).not.toBe(bookBeforeContent);
    });
  });

  describe('setChapter', () => {
    it('should update chapter when setChapter is called', () => {
      renderWithReaderProvider(<TestChild />);

      const button = screen.getByTestId('set-chapter');
      act(() => {
        button.click();
      });

      expectChapter(mockChapter2);
    });

    it('should trigger re-render in consumers when chapter changes', () => {
      renderWithReaderProvider(<TestChild />);

      const chapterBefore = screen.getByTestId('current-chapter');
      const chapterBeforeContent = chapterBefore.textContent;

      const button = screen.getByTestId('set-chapter');
      act(() => {
        button.click();
      });

      const chapterAfter = screen.getByTestId('current-chapter');
      expect(chapterAfter.textContent).not.toBe(chapterBeforeContent);
    });
  });

  describe('setVerse', () => {
    it('should update verse when setVerse is called', () => {
      renderWithReaderProvider(<TestChild />);

      const button = screen.getByTestId('set-verse');
      act(() => {
        button.click();
      });

      expectVerse(mockVerse2);
    });

    it('should update verse to null when setVerse is called with null', () => {
      renderWithReaderProvider(<TestChild />);

      const button = screen.getByTestId('clear-verse');
      act(() => {
        button.click();
      });

      expectVerse(null);
    });

    it('should trigger re-render in consumers when verse changes', () => {
      renderWithReaderProvider(<TestChild />);

      const verseBefore = screen.getByTestId('current-verse');
      const verseBeforeContent = verseBefore.textContent;

      const button = screen.getByTestId('set-verse');
      act(() => {
        button.click();
      });

      const verseAfter = screen.getByTestId('current-verse');
      expect(verseAfter.textContent).not.toBe(verseBeforeContent);
    });

    it('should trigger re-render when verse changes from value to null', () => {
      renderWithReaderProvider(<TestChild />);

      const verseBefore = screen.getByTestId('current-verse');
      expect(verseBefore.textContent).not.toBe('');

      const button = screen.getByTestId('clear-verse');
      act(() => {
        button.click();
      });

      const verseAfter = screen.getByTestId('current-verse');
      expect(verseAfter.textContent).toBe('');
    });
  });

  describe('state persistence', () => {
    it('should initialize with all provided props', () => {
      renderWithReaderProvider(<TestChild />);

      expectVersion(mockVersion);
      expectBook(mockBook);
      expectChapter(mockChapter);
      expectVerse(mockVerse);
    });

    it('should update state independently', () => {
      renderWithReaderProvider(<TestChild />);

      act(() => screen.getByTestId('set-version').click());

      // Verify book/chapter/verse remain unchanged
      expectBook(mockBook);
      expectChapter(mockChapter);
      expectVerse(mockVerse);
    });

    it('should handle rapid successive state updates without corruption', () => {
      renderWithReaderProvider(<TestChild />);

      // Perform multiple rapid updates to simulate potential race conditions
      act(() => {
        screen.getByTestId('set-version').click();
        screen.getByTestId('set-book').click();
        screen.getByTestId('set-chapter').click();
        screen.getByTestId('set-verse').click();
      });

      expectVersion(mockVersion2);
      expectBook(mockBook2);
      expectChapter(mockChapter2);
      expectVerse(mockVerse2);
    });
  });
});
