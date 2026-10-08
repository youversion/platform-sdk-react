import { renderHook, waitFor } from '@testing-library/react';
import type { GetLanguagesOptions } from '@youversion/platform-core';
import { expect, it, vi } from 'vitest';
import { useLanguages } from './useLanguages';
import { createLanguagesClientStub, createYVWrapper } from './test/utils';

it('forwards the complete language filter contract', async () => {
  const getLanguages = vi.fn().mockResolvedValue({ data: [], next_page_token: null });
  const wrapper = createYVWrapper('test-app-key', {
    languagesClient: createLanguagesClientStub({ getLanguages }),
  });
  const options: GetLanguagesOptions = {
    country: 'US',
    page_size: '*',
    page_token: 'next',
    fields: ['id', 'language', 'script'],
  };

  renderHook(() => useLanguages(options), { wrapper });

  await waitFor(() => expect(getLanguages).toHaveBeenCalledWith(options));
});
