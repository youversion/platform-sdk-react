import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { SearchClient } from '@youversion/platform-core';
import { useSearchClient } from './useSearchClient';
import { YouVersionContext } from './context';
import { createSearchClientStub, createYVWrapper } from './test/utils';

describe('useSearchClient', () => {
  it('creates a SearchClient when context is valid', () => {
    const wrapper = createYVWrapper();
    const { result } = renderHook(() => useSearchClient(), { wrapper });

    expect(result.current).toBeInstanceOf(SearchClient);
  });

  it('returns the injected SearchClient when present', () => {
    const searchClient = createSearchClientStub({});
    const wrapper = createYVWrapper('test-app-key', { searchClient });
    const { result } = renderHook(() => useSearchClient(), { wrapper });

    expect(result.current).toBe(searchClient);
  });

  it('throws when context is not provided', () => {
    expect(() => renderHook(() => useSearchClient())).toThrow(
      'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
    );
  });

  it('throws when appKey is missing', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={{ appKey: '' }}>{children}</YouVersionContext.Provider>
    );

    expect(() => renderHook(() => useSearchClient(), { wrapper })).toThrow(
      'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
    );
  });

  it('memoizes the SearchClient instance', () => {
    const wrapper = createYVWrapper();
    const { result, rerender } = renderHook(() => useSearchClient(), { wrapper });
    const firstClient = result.current;

    rerender();

    expect(result.current).toBe(firstClient);
  });
});
