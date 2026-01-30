import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useVerseSelection } from './useVerseSelection';
import { VerseSelectionProvider } from './context/VerseSelectionProvider';

// Wrapper for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <VerseSelectionProvider>{children}</VerseSelectionProvider>
);

describe('useVerseSelection', () => {
  it('should throw error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    expect(() => {
      renderHook(() => useVerseSelection());
    }).toThrow('useVerseSelection must be used within a VerseSelectionProvider');

    consoleSpy.mockRestore();
  });

  it('should return expected shape with correct initial values', () => {
    const { result } = renderHook(() => useVerseSelection(), { wrapper });

    expect(result.current.selectedVerseUsfms).toBeInstanceOf(Set);
    expect(result.current.selectedVerseUsfms.size).toBe(0);
    expect(result.current.selectedCount).toBe(0);
    expect(typeof result.current.toggleVerse).toBe('function');
    expect(typeof result.current.isSelected).toBe('function');
    expect(typeof result.current.clearSelection).toBe('function');
  });
});
