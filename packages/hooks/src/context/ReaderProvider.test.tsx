import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useReaderContext } from './ReaderContext';
import { ReaderProvider } from './ReaderProvider';
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

// Test wrappers
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReaderProvider
    currentVersion={mockVersion}
    currentBook={mockBook}
    currentChapter={mockChapter}
    currentVerse={mockVerse}
  >
    {children}
  </ReaderProvider>
);

const wrapperWithNullVerse = ({ children }: { children: React.ReactNode }) => (
  <ReaderProvider
    currentVersion={mockVersion}
    currentBook={mockBook}
    currentChapter={mockChapter}
    currentVerse={null}
  >
    {children}
  </ReaderProvider>
);

describe('ReaderProvider', () => {
  describe('initialization', () => {
    it('should initialize with provided version', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      expect(result.current.currentVersion).toEqual(mockVersion);
    });

    it('should initialize with provided book', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      expect(result.current.currentBook).toEqual(mockBook);
    });

    it('should initialize with provided chapter', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      expect(result.current.currentChapter).toEqual(mockChapter);
    });

    it('should initialize with provided verse', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      expect(result.current.currentVerse).toEqual(mockVerse);
    });

    it('should initialize with null verse when provided', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper: wrapperWithNullVerse });

      expect(result.current.currentVerse).toBeNull();
    });

    it('should throw error when useReaderContext is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => renderHook(() => useReaderContext())).toThrow(
        'useReaderContext() must be used within a ReaderProvider',
      );

      consoleError.mockRestore();
    });
  });

  describe('setVersion', () => {
    it('should update version when setVersion is called', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVersion(mockVersion2);
      });

      expect(result.current.currentVersion).toEqual(mockVersion2);
    });

    it('should preserve other state when version changes', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVersion(mockVersion2);
      });

      expect(result.current.currentVersion).toMatchObject({ abbreviation: 'NIV' });
      expect(result.current.currentBook).toEqual(mockBook);
      expect(result.current.currentChapter).toEqual(mockChapter);
      expect(result.current.currentVerse).toEqual(mockVerse);
    });
  });

  describe('setBook', () => {
    it('should update book when setBook is called', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setBook(mockBook2);
      });

      expect(result.current.currentBook).toEqual(mockBook2);
    });

    it('should preserve other state when book changes', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setBook(mockBook2);
      });

      expect(result.current.currentBook).toMatchObject({ id: 'JHN' });
      expect(result.current.currentVersion).toEqual(mockVersion);
      expect(result.current.currentChapter).toEqual(mockChapter);
      expect(result.current.currentVerse).toEqual(mockVerse);
    });
  });

  describe('setChapter', () => {
    it('should update chapter when setChapter is called', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setChapter(mockChapter2);
      });

      expect(result.current.currentChapter).toEqual(mockChapter2);
    });

    it('should preserve other state when chapter changes', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setChapter(mockChapter2);
      });

      expect(result.current.currentChapter).toMatchObject({ id: '3' });
      expect(result.current.currentVersion).toEqual(mockVersion);
      expect(result.current.currentBook).toEqual(mockBook);
      expect(result.current.currentVerse).toEqual(mockVerse);
    });
  });

  describe('setVerse', () => {
    it('should update verse when setVerse is called', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVerse(mockVerse2);
      });

      expect(result.current.currentVerse).toEqual(mockVerse2);
    });

    it('should update verse to null when setVerse is called with null', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVerse(null);
      });

      expect(result.current.currentVerse).toBeNull();
    });

    it('should preserve other state when verse changes', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVerse(mockVerse2);
      });

      expect(result.current.currentVerse).toMatchObject({ id: '16' });
      expect(result.current.currentVersion).toEqual(mockVersion);
      expect(result.current.currentBook).toEqual(mockBook);
      expect(result.current.currentChapter).toEqual(mockChapter);
    });

    it('should preserve other state when verse changes to null', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVerse(null);
      });

      expect(result.current.currentVerse).toBeNull();
      expect(result.current.currentVersion).toEqual(mockVersion);
      expect(result.current.currentBook).toEqual(mockBook);
      expect(result.current.currentChapter).toEqual(mockChapter);
    });
  });

  describe('state persistence', () => {
    it('should initialize with all provided props', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      expect(result.current.currentVersion).toEqual(mockVersion);
      expect(result.current.currentBook).toEqual(mockBook);
      expect(result.current.currentChapter).toEqual(mockChapter);
      expect(result.current.currentVerse).toEqual(mockVerse);
    });

    it('should handle rapid successive state updates without corruption', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      act(() => {
        result.current.setVersion(mockVersion2);
        result.current.setBook(mockBook2);
        result.current.setChapter(mockChapter2);
        result.current.setVerse(mockVerse2);
      });

      expect(result.current.currentVersion).toEqual(mockVersion2);
      expect(result.current.currentBook).toEqual(mockBook2);
      expect(result.current.currentChapter).toEqual(mockChapter2);
      expect(result.current.currentVerse).toEqual(mockVerse2);
    });
  });
});
