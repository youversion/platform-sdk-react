import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { VerseSelectionProvider } from './VerseSelectionProvider';
import { useVerseSelection } from '../useVerseSelection';

// Test helper component to interact with the context
function TestChild() {
  const { selectedVerseUsfms, toggleVerse, isSelected, clearSelection, selectedCount } =
    useVerseSelection();
  return (
    <div>
      <div data-testid="selected-count">{selectedCount}</div>
      <div data-testid="selected-usfms">{JSON.stringify([...selectedVerseUsfms])}</div>
      <button data-testid="toggle-mat-1-1" onClick={() => toggleVerse('MAT.1.1')}>
        Toggle MAT.1.1
      </button>
      <button data-testid="toggle-gen-1-1" onClick={() => toggleVerse('GEN.1.1')}>
        Toggle GEN.1.1
      </button>
      <button data-testid="toggle-jhn-3-16" onClick={() => toggleVerse('JHN.3.16')}>
        Toggle JHN.3.16
      </button>
      <button data-testid="clear" onClick={() => clearSelection()}>
        Clear
      </button>
      <div data-testid="is-mat-selected">{isSelected('MAT.1.1').toString()}</div>
      <div data-testid="is-gen-selected">{isSelected('GEN.1.1').toString()}</div>
    </div>
  );
}

// Wrapper for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <VerseSelectionProvider>{children}</VerseSelectionProvider>
);

describe('VerseSelectionProvider', () => {
  describe('initial state', () => {
    it('should have empty Set with selectedCount = 0', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      expect(getByTestId('selected-count')).toHaveTextContent('0');
      expect(getByTestId('selected-usfms')).toHaveTextContent('[]');
    });

    it('should return false for isSelected on any verse', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      expect(getByTestId('is-mat-selected')).toHaveTextContent('false');
      expect(getByTestId('is-gen-selected')).toHaveTextContent('false');
    });

    it('should provide an empty Set instance', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      expect(result.current.selectedVerseUsfms).toBeInstanceOf(Set);
      expect(result.current.selectedVerseUsfms.size).toBe(0);
    });
  });

  describe('toggleVerse', () => {
    it('should add verse to selection when not present', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      fireEvent.click(getByTestId('toggle-mat-1-1'));

      expect(getByTestId('selected-count')).toHaveTextContent('1');
      expect(getByTestId('selected-usfms')).toHaveTextContent('["MAT.1.1"]');
    });

    it('should remove verse from selection when already present', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      // Add verse
      fireEvent.click(getByTestId('toggle-mat-1-1'));
      expect(getByTestId('selected-count')).toHaveTextContent('1');

      // Remove verse
      fireEvent.click(getByTestId('toggle-mat-1-1'));
      expect(getByTestId('selected-count')).toHaveTextContent('0');
      expect(getByTestId('selected-usfms')).toHaveTextContent('[]');
    });

    it('should support multiple verses selected simultaneously', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      fireEvent.click(getByTestId('toggle-mat-1-1'));
      fireEvent.click(getByTestId('toggle-gen-1-1'));
      fireEvent.click(getByTestId('toggle-jhn-3-16'));

      expect(getByTestId('selected-count')).toHaveTextContent('3');
      expect(getByTestId('is-mat-selected')).toHaveTextContent('true');
      expect(getByTestId('is-gen-selected')).toHaveTextContent('true');
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
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      fireEvent.click(getByTestId('toggle-mat-1-1'));

      expect(getByTestId('is-mat-selected')).toHaveTextContent('true');
    });

    it('should return false for unselected verses', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      fireEvent.click(getByTestId('toggle-mat-1-1'));

      expect(getByTestId('is-gen-selected')).toHaveTextContent('false');
    });

    it('should work correctly after toggle operations', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      // Initially not selected
      expect(getByTestId('is-mat-selected')).toHaveTextContent('false');

      // Add verse - now selected
      fireEvent.click(getByTestId('toggle-mat-1-1'));
      expect(getByTestId('is-mat-selected')).toHaveTextContent('true');

      // Remove verse - not selected again
      fireEvent.click(getByTestId('toggle-mat-1-1'));
      expect(getByTestId('is-mat-selected')).toHaveTextContent('false');
    });

    it('should return correct value via hook', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      expect(result.current.isSelected('MAT.1.1')).toBe(false);

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      expect(result.current.isSelected('MAT.1.1')).toBe(true);
      expect(result.current.isSelected('GEN.1.1')).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should empty the Set', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      fireEvent.click(getByTestId('toggle-mat-1-1'));
      fireEvent.click(getByTestId('toggle-gen-1-1'));
      expect(getByTestId('selected-count')).toHaveTextContent('2');

      fireEvent.click(getByTestId('clear'));

      expect(getByTestId('selected-usfms')).toHaveTextContent('[]');
    });

    it('should reset selectedCount to 0', () => {
      const { getByTestId } = render(
        <VerseSelectionProvider>
          <TestChild />
        </VerseSelectionProvider>,
      );

      fireEvent.click(getByTestId('toggle-mat-1-1'));
      fireEvent.click(getByTestId('toggle-gen-1-1'));
      fireEvent.click(getByTestId('toggle-jhn-3-16'));
      expect(getByTestId('selected-count')).toHaveTextContent('3');

      fireEvent.click(getByTestId('clear'));

      expect(getByTestId('selected-count')).toHaveTextContent('0');
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

      // Should still create a new Set reference
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

  describe('Set immutability', () => {
    it('should create new Set on toggle add', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      const set1 = result.current.selectedVerseUsfms;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const set2 = result.current.selectedVerseUsfms;

      // Different references
      expect(set1).not.toBe(set2);

      // Original set unchanged
      expect(set1.has('MAT.1.1')).toBe(false);

      // New set has the verse
      expect(set2.has('MAT.1.1')).toBe(true);
    });

    it('should create new Set on toggle remove', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const set1 = result.current.selectedVerseUsfms;

      act(() => {
        result.current.toggleVerse('MAT.1.1');
      });

      const set2 = result.current.selectedVerseUsfms;

      // Different references
      expect(set1).not.toBe(set2);

      // Original set still has the verse (it's a snapshot)
      expect(set1.has('MAT.1.1')).toBe(true);

      // New set doesn't have the verse
      expect(set2.has('MAT.1.1')).toBe(false);
    });

    it('should create new Set on clear', () => {
      const { result } = renderHook(() => useVerseSelection(), { wrapper });

      act(() => {
        result.current.toggleVerse('MAT.1.1');
        result.current.toggleVerse('GEN.1.1');
      });

      const set1 = result.current.selectedVerseUsfms;

      act(() => {
        result.current.clearSelection();
      });

      const set2 = result.current.selectedVerseUsfms;

      // Different references
      expect(set1).not.toBe(set2);

      // Original set unchanged
      expect(set1.size).toBe(2);
      expect(set1.has('MAT.1.1')).toBe(true);
      expect(set1.has('GEN.1.1')).toBe(true);

      // New set is empty
      expect(set2.size).toBe(0);
    });
  });

  describe('useVerseSelection hook error handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

      expect(() => {
        renderHook(() => useVerseSelection());
      }).toThrow('useVerseSelection must be used within a VerseSelectionProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('provider rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <VerseSelectionProvider>
          <div>Test Content</div>
        </VerseSelectionProvider>,
      );

      expect(getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <VerseSelectionProvider>
          <div>Child 1</div>
          <div>Child 2</div>
        </VerseSelectionProvider>,
      );

      expect(getByText('Child 1')).toBeInTheDocument();
      expect(getByText('Child 2')).toBeInTheDocument();
    });
  });
});
