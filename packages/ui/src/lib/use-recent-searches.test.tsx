import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RECENT_SEARCHES_KEY, useRecentSearches } from './use-recent-searches';

it('persists the latest ten queries, ignores blank submissions, and moves repeats to the front', () => {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
  const view = renderHook(useRecentSearches);
  act(() => view.result.current.rememberSearch('   '));
  expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
  for (const query of [
    'love',
    'hope',
    'peace',
    'faith',
    'joy',
    'grace',
    'mercy',
    'patience',
    'kindness',
    'truth',
  ]) {
    act(() => view.result.current.rememberSearch(query));
  }
  expect(view.result.current.recentSearches).toHaveLength(10);
  act(() => view.result.current.rememberSearch(' wisdom '));
  act(() => view.result.current.rememberSearch(' HOPE '));
  const expected = [
    'HOPE',
    'wisdom',
    'truth',
    'kindness',
    'patience',
    'mercy',
    'grace',
    'joy',
    'faith',
    'peace',
  ];
  expect(view.result.current.recentSearches).toEqual(expected);
  view.unmount();
  const reopened = renderHook(useRecentSearches);
  expect(reopened.result.current.recentSearches).toEqual(expected);
  reopened.unmount();
  localStorage.removeItem(RECENT_SEARCHES_KEY);
});

it('tolerates invalid stored data and preserves in-memory history when storage throws', () => {
  localStorage.setItem(RECENT_SEARCHES_KEY, '{broken');
  const view = renderHook(useRecentSearches);
  expect(view.result.current.recentSearches).toEqual([]);
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  try {
    act(() => view.result.current.rememberSearch('hope'));
    expect(view.result.current.recentSearches).toEqual(['hope']);
    act(() => view.result.current.rememberSearch('peace'));
    expect(view.result.current.recentSearches).toEqual(['peace', 'hope']);
  } finally {
    write.mockRestore();
    view.unmount();
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  try {
    const blocked = renderHook(useRecentSearches);
    expect(blocked.result.current.recentSearches).toEqual([]);
    blocked.unmount();
  } finally {
    read.mockRestore();
  }
});
