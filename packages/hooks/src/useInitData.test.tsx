import { renderHook } from '@testing-library/react';
import { describe, expect, vi, beforeEach, it } from 'vitest';
import { useInitData, DEFAULT } from './useInitData';
import { useVersion } from './useVersion';
import { useBook } from './useBook';
import { useChapter } from './useChapter';
import { createYVWrapper } from './test/utils';
import { createMockVersion, createMockBook, createMockChapter } from './__tests__/mocks/bibles';

vi.mock('./useVersion');
vi.mock('./useBook');
vi.mock('./useChapter');

const mockVersion = createMockVersion();
const mockBook = createMockBook();
const mockChapter = createMockChapter();

function createLoadingState() {
  return { loading: true, error: null, refetch: vi.fn() };
}

function createErrorState(error: Error) {
  return { loading: false, error, refetch: vi.fn() };
}

function mockAllLoaded() {
  vi.mocked(useVersion).mockReturnValue({
    version: mockVersion,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useBook).mockReturnValue({
    book: mockBook,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useChapter).mockReturnValue({
    chapter: mockChapter,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function mockAllLoading() {
  vi.mocked(useVersion).mockReturnValue({
    ...createLoadingState(),
    version: null,
  });
  vi.mocked(useBook).mockReturnValue({
    ...createLoadingState(),
    book: null,
  });
  vi.mocked(useChapter).mockReturnValue({
    ...createLoadingState(),
    chapter: null,
  });
}

describe('useInitData', () => {
  beforeEach(() => {
    mockAllLoaded();
  });

  describe('loading state aggregation', () => {
    it('should return loading=false when all sub-hooks are done', () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.loading).toBe(false);
    });

    it.each([
      {
        hook: 'useVersion',
        setup: () =>
          vi.mocked(useVersion).mockReturnValue({
            ...createLoadingState(),
            version: null,
          }),
      },
      {
        hook: 'useBook',
        setup: () =>
          vi.mocked(useBook).mockReturnValue({
            ...createLoadingState(),
            book: null,
          }),
      },
      {
        hook: 'useChapter',
        setup: () =>
          vi.mocked(useChapter).mockReturnValue({
            ...createLoadingState(),
            chapter: null,
          }),
      },
    ])('should return loading=true when $hook is loading', ({ setup }) => {
      setup();
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.loading).toBe(true);
    });

    it('should return loading=true when all sub-hooks are loading', () => {
      mockAllLoading();
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.loading).toBe(true);
    });
  });

  describe('data composition', () => {
    it('should return combined data when all sub-hooks succeed', () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });

      expect.soft(result.current.data).toEqual({
        version: mockVersion,
        book: mockBook,
        chapter: mockChapter,
      });
    });

    it.each([
      {
        missing: 'version',
        setup: () =>
          vi.mocked(useVersion).mockReturnValue({
            version: null,
            loading: false,
            error: null,
            refetch: vi.fn(),
          }),
      },
      {
        missing: 'book',
        setup: () =>
          vi.mocked(useBook).mockReturnValue({
            book: null,
            loading: false,
            error: null,
            refetch: vi.fn(),
          }),
      },
      {
        missing: 'chapter',
        setup: () =>
          vi.mocked(useChapter).mockReturnValue({
            chapter: null,
            loading: false,
            error: null,
            refetch: vi.fn(),
          }),
      },
    ])('should return data=null when $missing is missing', ({ setup }) => {
      setup();
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.data).toBe(null);
    });
  });

  describe('error aggregation', () => {
    it('should return empty string when no errors', () => {
      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.error).toBe('');
    });

    it('should return single error as string', () => {
      vi.mocked(useVersion).mockReturnValue({
        ...createErrorState(new Error('version failed')),
        version: null,
      });

      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.error).toBe('Error: version failed');
    });

    it('should join multiple errors with space', () => {
      vi.mocked(useVersion).mockReturnValue({
        ...createErrorState(new Error('version failed')),
        version: null,
      });
      vi.mocked(useBook).mockReturnValue({
        ...createErrorState(new Error('book failed')),
        book: null,
      });

      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.error).toBe('Error: version failed Error: book failed');
    });

    it('should join all three errors when all fail', () => {
      vi.mocked(useVersion).mockReturnValue({
        ...createErrorState(new Error('v')),
        version: null,
      });
      vi.mocked(useBook).mockReturnValue({
        ...createErrorState(new Error('b')),
        book: null,
      });
      vi.mocked(useChapter).mockReturnValue({
        ...createErrorState(new Error('c')),
        chapter: null,
      });

      const wrapper = createYVWrapper();
      const { result } = renderHook(() => useInitData(), { wrapper });
      expect(result.current.error).toBe('Error: v Error: b Error: c');
    });
  });

  describe('default parameters', () => {
    it('should use defaults when no args provided', () => {
      const wrapper = createYVWrapper();
      renderHook(() => useInitData(), { wrapper });

      expect.soft(useVersion).toHaveBeenCalledWith(DEFAULT.VERSION);
      expect.soft(useBook).toHaveBeenCalledWith(DEFAULT.VERSION, DEFAULT.BOOK);
      expect.soft(useChapter).toHaveBeenCalledWith(DEFAULT.VERSION, DEFAULT.BOOK, DEFAULT.CHAPTER);
    });

    it('should have correct default values', () => {
      expect.soft(DEFAULT.VERSION).toBe(3034);
      expect.soft(DEFAULT.BOOK).toBe('GEN');
      expect.soft(DEFAULT.CHAPTER).toBe(1);
    });
  });

  describe('custom parameters', () => {
    it('should pass custom params to sub-hooks', () => {
      const wrapper = createYVWrapper();
      renderHook(() => useInitData({ version: 111, book: 'MAT', chapter: 5 }), { wrapper });

      expect.soft(useVersion).toHaveBeenCalledWith(111);
      expect.soft(useBook).toHaveBeenCalledWith(111, 'MAT');
      expect.soft(useChapter).toHaveBeenCalledWith(111, 'MAT', 5);
    });
  });
});
