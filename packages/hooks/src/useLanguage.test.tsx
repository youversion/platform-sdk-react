import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createLanguagesClientStub, createYVWrapper } from './test/utils';
import { useLanguage } from './useLanguage';

it('forwards language tags and separates their cached results', async () => {
  const english = { id: 'en', language: 'en' };
  const chinese = { id: 'zh-Hans', language: 'zh', script: 'Hans' };
  const getLanguage = vi.fn().mockResolvedValueOnce(english).mockResolvedValueOnce(chinese);
  const wrapper = createYVWrapper('test-app-key', {
    languagesClient: createLanguagesClientStub({ getLanguage }),
  });
  const { result, rerender } = renderHook(({ tag }) => useLanguage(tag), {
    initialProps: { tag: 'en' },
    wrapper,
  });
  await waitFor(() => expect(result.current.language).toEqual(english));
  act(() => rerender({ tag: 'zh-Hans' }));
  await waitFor(() => expect(result.current.language).toEqual(chinese));
  expect(getLanguage.mock.calls).toEqual([['en'], ['zh-Hans']]);
});
