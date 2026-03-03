import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useContext } from 'react';
import { ReaderContext, useReaderContext } from './ReaderContext';
import { ReaderProvider } from './ReaderProvider';
import {
  createMockBook,
  createMockChapter,
  createMockVerse,
  createMockVersion,
} from '../__tests__/mocks/bibles';

const mockVersion = createMockVersion();
const mockBook = createMockBook();
const mockChapter = createMockChapter();
const mockVerse = createMockVerse();

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

describe('ReaderContext', () => {
  describe('createContext default', () => {
    it('should have null as default context value', () => {
      const { result } = renderHook(() => useContext(ReaderContext));

      expect(result.current).toBeNull();
    });
  });

  describe('useReaderContext', () => {
    it('should throw error when used outside ReaderProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => renderHook(() => useReaderContext())).toThrow(
        'useReaderContext() must be used within a ReaderProvider',
      );

      consoleError.mockRestore();
    });

    it('should return context with all expected keys', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });
      const keys = Object.keys(result.current);

      expect(keys).toContain('currentVersion');
      expect(keys).toContain('currentChapter');
      expect(keys).toContain('currentBook');
      expect(keys).toContain('currentVerse');
      expect(keys).toContain('setVersion');
      expect(keys).toContain('setChapter');
      expect(keys).toContain('setBook');
      expect(keys).toContain('setVerse');
    });

    it('should return functions for all setters', () => {
      const { result } = renderHook(() => useReaderContext(), { wrapper });

      expect(typeof result.current.setVersion).toBe('function');
      expect(typeof result.current.setChapter).toBe('function');
      expect(typeof result.current.setBook).toBe('function');
      expect(typeof result.current.setVerse).toBe('function');
    });

    describe('setter updates', () => {
      it('should update currentVersion when setVersion is called', () => {
        const { result } = renderHook(() => useReaderContext(), { wrapper });

        act(() => {
          result.current.setVersion(mockVersion2);
        });

        expect(result.current.currentVersion).toEqual(mockVersion2);
      });

      it('should update currentBook when setBook is called', () => {
        const { result } = renderHook(() => useReaderContext(), { wrapper });

        act(() => {
          result.current.setBook(mockBook2);
        });

        expect(result.current.currentBook).toEqual(mockBook2);
      });

      it('should update currentChapter when setChapter is called', () => {
        const { result } = renderHook(() => useReaderContext(), { wrapper });

        act(() => {
          result.current.setChapter(mockChapter2);
        });

        expect(result.current.currentChapter).toEqual(mockChapter2);
      });

      it('should update currentVerse when setVerse is called', () => {
        const { result } = renderHook(() => useReaderContext(), { wrapper });

        act(() => {
          result.current.setVerse(mockVerse2);
        });

        expect(result.current.currentVerse).toEqual(mockVerse2);
      });

      it('should set currentVerse to null', () => {
        const { result } = renderHook(() => useReaderContext(), { wrapper });

        act(() => {
          result.current.setVerse(null);
        });

        expect(result.current.currentVerse).toBeNull();
      });
    });
  });
});
