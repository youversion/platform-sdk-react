import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { VerseSelectionProvider } from './VerseSelectionProvider';
import { useVerseSelection } from '../useVerseSelection';

// Wrapper for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <VerseSelectionProvider>{children}</VerseSelectionProvider>
);

describe('VerseSelectionProvider', () => {
  describe('initial state', () => {
    it('should provide an empty Set instance', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      expect(result.current.selectedVerseUsfms).toBeInstanceOf(Set);
      expect(result.current.selectedVerseUsfms.size).toBe(0);
    });

    it('should have selectedCount of 0', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should return false for isSelected on any verse', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      expect(result.current.isSelected('MAT.1.1')).toBe(false);
      expect(result.current.isSelected('GEN.1.1')).toBe(false);
    });
  });

  describe('toggleVerse', () => {
    it('should add verse to selection when not present', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      expect(result.current.selectedVerseUsfms.has('MAT.1.1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should remove verse from selection when already present', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      expect(result.current.selectedVerseUsfms.has('MAT.1.1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should support multiple verses selected simultaneously', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
        result.current.toggleVerse('GEN.1.1');
        result.current.toggleVerse('JHN.3.16');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.selectedVerseUsfms.has('MAT.1.1')).toBe(true);
      expect(result.current.selectedVerseUsfms.has('GEN.1.1')).toBe(true);
      expect(result.current.selectedVerseUsfms.has('JHN.3.16')).toBe(true);
    });

    it('should create new Set reference on each update (immutability)', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      const set1 = result.current.selectedVerseUsfms;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const set2 = result.current.selectedVerseUsfms;

      expect(set1).not.toBe(set2);
      expect(set1.size).toBe(0);
      expect(set2.size).toBe(1);
    });

    it('should create new Set reference when removing a verse', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const setWithVerse = result.current.selectedVerseUsfms;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const setWithoutVerse = result.current.selectedVerseUsfms;

      expect(setWithVerse).not.toBe(setWithoutVerse);
      expect(setWithVerse.size).toBe(1);
      expect(setWithoutVerse.size).toBe(0);
    });

    it('should not add duplicate verses', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
        result.current.toggleVerse('MAT.1.1');
      });

      // Should toggle off, not add twice
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('isSelected', () => {
    it('should return true for selected verses', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      expect(result.current.isSelected('MAT.1.1')).toBe(true);
    });

    it('should return false for unselected verses', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      expect(result.current.isSelected('GEN.1.1')).toBe(false);
    });

    it('should work correctly after toggle operations', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      // Initially not selected
      expect(result.current.isSelected('MAT.1.1')).toBe(false);

      // Add verse - now selected
      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });
      expect(result.current.isSelected('MAT.1.1')).toBe(true);

      // Remove verse - not selected again
      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });
      expect(result.current.isSelected('MAT.1.1')).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected verses', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
        result.current.toggleVerse('GEN.1.1');
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectedVerseUsfms.size).toBe(0);
    });

    it('should create new Set reference', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const setBeforeClear = result.current.selectedVerseUsfms;

      act(() => {
        result.current.clearSelection();
      });

      const setAfterClear = result.current.selectedVerseUsfms;

      expect(setBeforeClear).not.toBe(setAfterClear);
      expect(setBeforeClear.size).toBe(1);
      expect(setAfterClear.size).toBe(0);
    });

    it('should work when already empty', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      const setBeforeClear = result.current.selectedVerseUsfms;

      act(() => {
        result.current.clearSelection();
      });

      const setAfterClear = result.current.selectedVerseUsfms;

      expect(setBeforeClear).not.toBe(setAfterClear);
      expect(setAfterClear.size).toBe(0);
    });
  });

  describe('selectedCount', () => {
    it('should start at 0', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should increment when verse added', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });
      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.toggleVerse('GEN.1.1');
      });
      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.toggleVerse('JHN.3.16');
      });
      expect(result.current.selectedCount).toBe(3);
    });

    it('should decrement when verse removed', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
        result.current.toggleVerse('GEN.1.1');
      });
      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });
      expect(result.current.selectedCount).toBe(1);
    });

    it('should return to 0 after clear', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
        result.current.toggleVerse('GEN.1.1');
        result.current.toggleVerse('JHN.3.16');
      });
      expect(result.current.selectedCount).toBe(3);

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('callback stability', () => {
    it('should have stable toggleVerse reference across renders', () => {
      const { result, rerender } = renderHook(() => useVerseSelection(), { wrapper });

      const toggleRef1 = result.current.toggleVerse;

      rerender();

      const toggleRef2 = result.current.toggleVerse;

      expect(toggleRef1).toBe(toggleRef2);
    });

    it('should have stable clearSelection reference across renders', () => {
      const { result, rerender } = renderHook(() => useVerseSelection(), { wrapper });

      const clearRef1 = result.current.clearSelection;

      rerender();

      const clearRef2 = result.current.clearSelection;

      expect(clearRef1).toBe(clearRef2);
    });

    it('should have stable toggleVerse reference after state changes', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      const toggleRef1 = result.current.toggleVerse;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const toggleRef2 = result.current.toggleVerse;

      expect(toggleRef1).toBe(toggleRef2);
    });

    it('should have stable clearSelection reference after state changes', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      const clearRef1 = result.current.clearSelection;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const clearRef2 = result.current.clearSelection;

      expect(clearRef1).toBe(clearRef2);
    });

    it('should update isSelected reference when selectedVerseUsfms changes', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      const isSelectedRef1 = result.current.isSelected;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const isSelectedRef2 = result.current.isSelected;

      // isSelected has selectedVerseUsfms in its dependency array, so it should change
      expect(isSelectedRef1).not.toBe(isSelectedRef2);
    });

    it('should have stable isSelected reference when no state changes', () => {
      const { result, rerender } = renderHook(() => useVerseSelection(), { wrapper });

      const isSelectedRef1 = result.current.isSelected;

      rerender();

      const isSelectedRef2 = result.current.isSelected;

      expect(isSelectedRef1).toBe(isSelectedRef2);
    });
  });
});
