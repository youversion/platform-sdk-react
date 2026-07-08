import { act, renderHook } from '@testing-library/react';
import { createElement, type ContextType, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock only `useHighlights`; keep the real `YouVersionAuthContext` so we can
// drive signed-in state through a Provider.
const { useHighlightsMock, createHighlight, deleteHighlight } = vi.hoisted(() => ({
  useHighlightsMock: vi.fn(),
  createHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}));

vi.mock('@youversion/platform-react-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@youversion/platform-react-hooks')>();
  return { ...actual, useHighlights: useHighlightsMock };
});

import { YouVersionAuthContext } from '@youversion/platform-react-hooks';
import { useReaderHighlights } from './use-reader-highlights';

type Highlight = { version_id: number; passage_id: string; color: string };

const signedIn = {
  userInfo: { id: 'user-1' },
  setUserInfo: () => {},
  isLoading: false,
  error: null,
} as unknown as ContextType<typeof YouVersionAuthContext>;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(YouVersionAuthContext.Provider, { value: signedIn }, children);
}

function mockServerHighlights(data: Highlight[]) {
  useHighlightsMock.mockReturnValue({
    highlights: { data, next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
    createHighlight,
    deleteHighlight,
    getRecentColors: vi.fn(),
  });
}

const JHN3 = { versionId: 111, book: 'JHN', chapter: '3' };

describe('useReaderHighlights (signed in)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createHighlight.mockResolvedValue({});
    deleteHighlight.mockResolvedValue(undefined);
    mockServerHighlights([]);
  });

  it('fetches highlights for the current version + chapter scope', () => {
    renderHook(() => useReaderHighlights(JHN3), { wrapper });
    expect(useHighlightsMock).toHaveBeenCalledWith(
      { version_id: 111, passage_id: 'JHN.3' },
      { enabled: true },
    );
  });

  it('builds the map from server data, filtered to the current version + chapter', () => {
    mockServerHighlights([
      { version_id: 111, passage_id: 'JHN.3.16', color: 'ffff00' },
      { version_id: 111, passage_id: 'JHN.3.17', color: 'aabbcc' },
      { version_id: 111, passage_id: 'GEN.1.1', color: 'ddeeff' }, // other chapter → excluded
      { version_id: 999, passage_id: 'JHN.3.16', color: '000000' }, // other version → excluded
    ]);

    const { result } = renderHook(() => useReaderHighlights(JHN3), { wrapper });

    expect(result.current.highlightsByPassageId).toEqual({
      'JHN.3.16': 'ffff00',
      'JHN.3.17': 'aabbcc',
    });
  });

  it('applyHighlight posts one createHighlight per verse with USFM passage_id and optimistically paints', () => {
    const { result } = renderHook(() => useReaderHighlights(JHN3), { wrapper });

    act(() => result.current.applyHighlight([16, 17], 'ffff00'));

    expect(createHighlight).toHaveBeenCalledTimes(2);
    expect(createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.16',
      color: 'ffff00',
    });
    expect(createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.17',
      color: 'ffff00',
    });
    expect(result.current.highlightsByPassageId).toEqual({
      'JHN.3.16': 'ffff00',
      'JHN.3.17': 'ffff00',
    });
  });

  it('removeHighlight deletes only passages matching the color and clears them from the map', () => {
    mockServerHighlights([
      { version_id: 111, passage_id: 'JHN.3.16', color: 'ffff00' },
      { version_id: 111, passage_id: 'JHN.3.17', color: 'aabbcc' },
    ]);

    const { result } = renderHook(() => useReaderHighlights(JHN3), { wrapper });

    // Remove ffff00 across both verses; only 3.16 matches that color.
    act(() => result.current.removeHighlight([16, 17], 'ffff00'));

    expect(deleteHighlight).toHaveBeenCalledTimes(1);
    expect(deleteHighlight).toHaveBeenCalledWith('JHN.3.16', { version_id: 111 });
    expect(result.current.highlightsByPassageId).toEqual({ 'JHN.3.17': 'aabbcc' });
  });
});
